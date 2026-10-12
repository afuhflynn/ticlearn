import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  userImage: string | null;
  score: number;
  marksEarned: number;
  isCorrect: boolean;
  userAnswer: string;
  timeAnswered: number | null;
  createdAt: Date;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> },
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

    const { questionId } = await params;

    const attempts = await prisma.paper3QuestionAttempt.findMany({
      where: { questionId },
      skip,
      take: limit,
      orderBy: [
        { score: "desc" },
        { marksEarned: "desc" },
        { createdAt: "asc" },
      ],
    });

    const total = await prisma.paper3QuestionAttempt.count({
      where: { questionId },
    });

    const currentUserAttempt = await prisma.paper3QuestionAttempt.findFirst({
      where: { questionId, userId: session.user.id },
      orderBy: [{ score: "desc" }, { marksEarned: "desc" }],
    });

    // Get user details for leaderboard
    const userIds = [...new Set(attempts.map((a) => a.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, role: { not: "ADMIN" } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const leaderboard = attempts.map((attempt, index) => {
      const user = userMap.get(attempt.userId);
      return {
        rank: skip + index + 1,
        userId: attempt.userId,
        userName: user?.name ?? null,
        userImage: user?.image ?? null,
        score: attempt.score,
        marksEarned: attempt.marksEarned,
        isCorrect: attempt.isCorrect,
        userAnswer: attempt.userAnswer,
        timeAnswered: attempt.timeAnswered,
        createdAt: attempt.createdAt,
      };
    });

    let currentUserRank: number | null = null;
    if (currentUserAttempt) {
      const rankResult = await prisma.paper3QuestionAttempt.count({
        where: {
          questionId,
          user: { role: { not: "ADMIN" } },
          OR: [
            { score: { gt: currentUserAttempt.score } },
            {
              score: { equals: currentUserAttempt.score },
              marksEarned: { gt: currentUserAttempt.marksEarned },
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
      currentUserAttempt: currentUserAttempt
        ? {
            userAnswer: currentUserAttempt.userAnswer,
            isCorrect: currentUserAttempt.isCorrect,
            marksEarned: currentUserAttempt.marksEarned,
            score: currentUserAttempt.score,
          }
        : null,
    });
  } catch (error) {
    console.error("Paper3 question leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch question leaderboard" },
      { status: 500 },
    );
  }
}
