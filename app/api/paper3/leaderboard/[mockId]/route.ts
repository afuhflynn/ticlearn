import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  score: number | null;
  timeTaken?: number | null;
  examsTaken?: number;
  avgScore?: number;
  totalPoints?: number;
  lastExamAt?: string | null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mockId: string }> },
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

    const { mockId } = await params;

    if (mockId === "global") {
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

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leaderboard: LeaderboardEntry[] = stats.map((stat, index) => {
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
    }

    const [attempts, total, currentUserAttempt] = await Promise.all([
      prisma.paper3MockAttempt.findMany({
        where: { mockId, status: "COMPLETED", user: { role: { not: "ADMIN" } } },
        skip,
        take: limit,
        orderBy: [{ score: "desc" }, { timeTaken: "asc" }],
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.paper3MockAttempt.count({
        where: { mockId, status: "COMPLETED", user: { role: { not: "ADMIN" } } },
      }),
      prisma.paper3MockAttempt.findFirst({
        where: { mockId, userId: session.user.id, status: "COMPLETED", user: { role: { not: "ADMIN" } } },
        orderBy: [{ score: "desc" }, { timeTaken: "asc" }],
      }),
    ]);

    const leaderboard = attempts.map((attempt, index) => ({
      rank: skip + index + 1,
      userId: attempt.user.id,
      userName: attempt.user.name,
      userImage: attempt.user.image,
      score: attempt.score,
      timeTaken: attempt.timeTaken,
    }));

    let currentUserRank: number | null = null;
    if (currentUserAttempt) {
      const rankResult = await prisma.paper3MockAttempt.count({
        where: {
          mockId,
          status: "COMPLETED",
          user: { role: { not: "ADMIN" } },
          OR: [
            { score: { gt: currentUserAttempt.score } },
            {
              score: { equals: currentUserAttempt.score },
              timeTaken: { lt: currentUserAttempt.timeTaken ?? 999999 },
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
      isGlobal: false,
    });
  } catch (error) {
    console.error("Paper3 leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}