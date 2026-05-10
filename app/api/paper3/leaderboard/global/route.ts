import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
) {
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

    const [stats, total] = await Promise.all([
      prisma.paper3UserStats.findMany({
        orderBy: [{ totalPoints: "desc" }, { avgScore: "desc" }],
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.paper3UserStats.count(),
    ]);

    const leaderboard = stats.map((stat, index) => {
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

    const userStats = await prisma.paper3UserStats.findUnique({
      where: { userId: session.user.id },
    });

    let currentUserRank: number | null = null;
    if (userStats) {
      const rankResult = await prisma.paper3UserStats.count({
        where: {
          OR: [
            { totalPoints: { gt: userStats.totalPoints } },
            {
              totalPoints: { equals: userStats.totalPoints },
              avgScore: { gt: userStats.avgScore },
            },
          ],
        },
      });
      currentUserRank = rankResult + 1;
    }

    return NextResponse.json({
      leaderboard,
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