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

    const [allStats, total] = await Promise.all([
      prisma.paper3UserStats.findMany({
        where: { user: { role: { not: "ADMIN" } }, examProfileId: { not: null } },
        orderBy: [{ totalPoints: "desc" }, { avgScore: "desc" }],
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.paper3UserStats.count({
        where: { user: { role: { not: "ADMIN" } }, examProfileId: { not: null } },
      }),
    ]);

    // Deduplicate by userId — keep highest totalPoints profile per user
    const userMap = new Map<string, typeof allStats[0]>();
    for (const stat of allStats) {
      const existing = userMap.get(stat.userId);
      if (!existing || stat.totalPoints > existing.totalPoints) {
        userMap.set(stat.userId, stat);
      }
    }
    const uniqueStats = Array.from(userMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints || b.avgScore - a.avgScore);

    const paginated = uniqueStats.slice(skip, skip + limit);

    const leaderboard = paginated.map((stat, index) => {
      const recencyBonus = stat.mockExamsTaken > 0 ? 0.1 * Math.min(stat.mockExamsTaken, 5) : 0;
      const adjustedScore = Math.min(stat.avgScore + recencyBonus, 100);

      return {
        rank: skip + index + 1,
        userId: stat.userId,
        userName: stat.user.name,
        userImage: stat.user.image,
        score: Math.round(adjustedScore * 10) / 10,
        examsTaken: stat.mockExamsTaken,
        avgScore: Math.round(stat.avgScore * 10) / 10,
        totalPoints: stat.totalPoints,
      };
    });

    const profileId = await getActiveProfileId(session.user.id);
    const userStats = profileId
      ? await prisma.paper3UserStats.findFirst({ where: { examProfileId: profileId } })
      : await prisma.paper3UserStats.findUnique({ where: { userId: session.user.id } });

    let currentUserRank: number | null = null;
    if (userStats) {
      const betterCount = uniqueStats.filter(
        (s) => s.totalPoints > userStats.totalPoints ||
          (s.totalPoints === userStats.totalPoints && s.avgScore > userStats.avgScore)
      ).length;
      currentUserRank = betterCount + 1;
    }

    return NextResponse.json({
      leaderboard,
      total: uniqueStats.length,
      page,
      totalPages: Math.ceil(uniqueStats.length / limit),
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
