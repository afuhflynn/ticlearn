import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leaderboard = await prisma.userStats.findMany({
      orderBy: { totalPoints: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const currentUserRank = leaderboard.findIndex(
      (entry) => entry.userId === session.user.id,
    );

    return NextResponse.json({
      leaderboard: leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.user.id,
        userName: entry.user.name,
        userImage: entry.user.image,
        totalPoints: entry.totalPoints,
        quizzesTaken: entry.quizzesTaken,
        currentStreak: entry.currentStreak,
      })),
      currentUserRank: currentUserRank >= 0 ? currentUserRank + 1 : null,
    });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
