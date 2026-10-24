import { prisma } from "@/lib/prisma";

/**
 * The one read the dashboard paints, from spec 0014. It answers a single
 * question: where did this student leave off? Three pieces of evidence and one
 * action, no numbers, no score.
 *
 * The API route calls this and so does the server render of the dashboard page,
 * so a prefetched value and a fetched value are the same shape by construction
 * rather than by two copies that happen to agree.
 *
 * The payload is the JSON ready shape, with dates as strings, exactly as the
 * route serialises it. A prefetched row that still held a `Date` would not match
 * what the client hook receives, and the paint would flip.
 */

export interface DashboardContinue {
  recentNotes: Array<{
    id: string;
    title: string;
    fileName: string;
    status: string;
    createdAt: string;
  }>;
  lastAttempt: {
    attemptId: string;
    quizId: string | null;
    title: string;
    answeredAt: string;
  } | null;
  lastConversation: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
}

function jsonReady<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getDashboardContinue(
  userId: string,
): Promise<DashboardContinue> {
  const [notes, attempt, conversation] = await Promise.all([
    prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.quizAttempt.findFirst({
      where: { userId },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        quizId: true,
        quizTitle: true,
        completedAt: true,
      },
    }),
    prisma.chatConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);

  return {
    recentNotes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      fileName: note.fileName,
      status: note.status,
      createdAt: note.createdAt.toISOString(),
    })),
    lastAttempt: attempt
      ? {
          attemptId: attempt.id,
          quizId: attempt.quizId,
          title: attempt.quizTitle,
          answeredAt: attempt.completedAt.toISOString(),
        }
      : null,
    lastConversation: conversation
      ? {
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt.toISOString(),
        }
      : null,
  };
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
