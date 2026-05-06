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
  timeTaken: number | null;
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

    const [attempts, total, currentUserAttempt] = await Promise.all([
      prisma.paper3MockAttempt.findMany({
        where: { mockId, status: "COMPLETED" },
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
        where: { mockId, status: "COMPLETED" },
      }),
      prisma.paper3MockAttempt.findFirst({
        where: { mockId, userId: session.user.id, status: "COMPLETED" },
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
    });
  } catch (error) {
    console.error("Paper3 leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
