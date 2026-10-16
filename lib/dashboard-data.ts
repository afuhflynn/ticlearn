import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/readiness";

/**
 * The reads the dashboard paints, in one place. The API routes call these and so
 * does the server render of the dashboard page, so a prefetched value and a
 * fetched value are the same shape by construction rather than by two copies
 * that happen to agree.
 *
 * Every function returns the JSON ready shape, with dates as strings, exactly as
 * the route serialises it. A prefetched row that still held a `Date` would not
 * match what the client hook receives, and the paint would flip.
 */

export interface DashboardReadiness {
  readiness: number;
  weakestTopic: { name: string; score: number } | null;
  strongestTopic: { name: string; score: number } | null;
  topicReadiness: Array<{ topic: string; score: number; notes: number }>;
  needsAssessment: boolean;
  recommendations: string[];
}

function jsonReady<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getDashboardStats(userId: string) {
  const attemptFilter = { userId };

  const [userStats, noteCount, quizCount, attemptCount, avgScore] =
    await Promise.all([
      prisma.userStats.findFirst({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.quiz.count({ where: { userId } }),
      prisma.quizAttempt.count({ where: attemptFilter }),
      prisma.quizAttempt.aggregate({
        where: attemptFilter,
        _avg: { score: true },
      }),
    ]);

  return jsonReady({
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
}

export async function getDashboardNotes(userId: string) {
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { quizzes: true },
      },
      quizzes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          title: true,
          createdAt: true,
        },
      },
    },
  });

  return jsonReady({
    notes: notes.map((note) => ({
      ...note,
      quizCount: note._count.quizzes,
      latestQuiz: note.quizzes[0] ?? null,
    })),
  });
}

export type QuizScope = "all" | "my" | "public";

export async function getDashboardQuizzes(
  userId: string,
  scope: QuizScope = "all",
  noteId?: string | null,
) {
  const byNote = noteId ? { noteId } : {};
  const where =
    scope === "my"
      ? { userId, ...byNote }
      : scope === "public"
        ? { isPublic: true, status: "READY" as const, ...byNote }
        : {
            OR: [{ userId }, { isPublic: true }],
            ...byNote,
          };

  const quizzes = await prisma.quiz.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
      note: {
        select: { id: true, title: true },
      },
      _count: {
        select: { attempts: true },
      },
    },
  });

  return jsonReady({
    quizzes: quizzes.map((quiz) => ({
      ...quiz,
      attemptCount: quiz._count.attempts,
      isOwner: quiz.userId === userId,
    })),
  });
}

export async function getDashboardReadiness(
  userId: string,
): Promise<DashboardReadiness> {
  const readiness = await computeReadiness(userId);

  const recommendations: string[] = [];

  if (readiness.weakestTopic && readiness.weakestTopic.score < 40) {
    recommendations.push(
      `Practice ${readiness.weakestTopic.name} - currently at ${readiness.weakestTopic.score}%`,
    );
  }

  if (readiness.needsAssessment) {
    recommendations.push(
      "Upload a note and generate a quiz from it to see your readiness",
    );
  }

  const recentlyPractised = await prisma.topicPerformance.count({
    where: {
      note: { userId },
      lastPracticedAt: {
        gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    },
  });

  if (recentlyPractised === 0 && readiness.weakestTopic) {
    recommendations.push(
      `You haven't practised ${readiness.weakestTopic.name} recently`,
    );
  }

  return jsonReady({ ...readiness, recommendations });
}
