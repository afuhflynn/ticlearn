import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Use window function to deduplicate by userId (keep highest-points profile)
    const leaderboard = await prisma.$queryRawUnsafe<
      Array<{
        user_id: string;
        user_name: string | null;
        user_image: string | null;
        total_points: number;
        avg_score: number;
        mock_exams_taken: number;
      }>
    >(
      `SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.image AS user_image,
        ranked.total_points,
        ranked.avg_score,
        ranked.mock_exams_taken
      FROM (
        SELECT DISTINCT ON (p.user_id)
          p.user_id,
          p.total_points,
          p.avg_score,
          p.mock_exams_taken
        FROM paper3_user_stats p
        WHERE p.exam_profile_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.id = p.user_id AND u2.role = 'ADMIN')
        ORDER BY p.user_id, p.total_points DESC, p.avg_score DESC
      ) ranked
      JOIN users u ON u.id = ranked.user_id
      ORDER BY ranked.total_points DESC, ranked.avg_score DESC
      OFFSET $1 LIMIT $2`,
      skip,
      limit,
    );

    // Count total unique non-admin users with stats
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) AS count FROM (
        SELECT DISTINCT ON (p.user_id) p.user_id
        FROM paper3_user_stats p
        WHERE p.exam_profile_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id AND u.role = 'ADMIN')
      ) deduped`,
    );
    const total = Number(countResult[0]?.count ?? 0);

    const mapped = leaderboard.map((row, index) => {
      const recencyBonus =
        row.mock_exams_taken > 0 ? 0.1 * Math.min(row.mock_exams_taken, 5) : 0;
      const adjustedScore = Math.min(row.avg_score + recencyBonus, 100);

      return {
        rank: skip + index + 1,
        userId: row.user_id,
        userName: row.user_name,
        userImage: row.user_image,
        score: Math.round(adjustedScore * 10) / 10,
        examsTaken: row.mock_exams_taken,
        avgScore: Math.round(row.avg_score * 10) / 10,
        totalPoints: row.total_points,
      };
    });

    const userStats = await prisma.paper3UserStats.findFirst({
      where: { userId: session.user.id },
    });

    let currentUserRank: number | null = null;
    if (userStats) {
      const betterCount = await prisma.$queryRawUnsafe<
        Array<{ count: string }>
      >(
        `SELECT COUNT(*) AS count FROM (
          SELECT DISTINCT ON (p.user_id) p.total_points, p.avg_score
          FROM paper3_user_stats p
          WHERE p.exam_profile_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id AND u.role = 'ADMIN')
            AND (p.total_points > $1 OR (p.total_points = $1 AND p.avg_score > $2))
        ) better`,
        userStats.totalPoints,
        userStats.avgScore,
      );
      currentUserRank = Number(betterCount[0]?.count ?? 0) + 1;
    }

    return NextResponse.json({
      leaderboard: mapped,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      currentUserRank,
      isGlobal: true,
    });
  } catch (error) {
    console.error("Paper3 global leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch global leaderboard" },
      { status: 500 },
    );
  }
}
