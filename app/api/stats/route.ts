import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const profileId = await getActiveProfileId(userId);
    const attemptFilter = profileId ? { examProfileId: profileId } : { userId };

    const [userStats, noteCount, quizCount, attemptCount, avgScore] =
      await Promise.all([
        prisma.userStats.findUnique({
          where: { userId },
        }),
        prisma.note.count({ where: { userId } }),
        prisma.quiz.count({ where: { userId } }),
        prisma.quizAttempt.count({ where: attemptFilter }),
        prisma.quizAttempt.aggregate({
          where: attemptFilter,
          _avg: { score: true },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalPoints: userStats?.totalPoints || 0,
        currentStreak: userStats?.currentStreak || 0,
        quizzesTaken: userStats?.quizzesTaken || 0,
        avgScore: avgScore._avg.score || 0,
        totalNotes: noteCount,
        totalQuizzes: quizCount,
        totalAttempts: attemptCount,
      },
    });
  } catch (error) {
    console.error("Stats GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
