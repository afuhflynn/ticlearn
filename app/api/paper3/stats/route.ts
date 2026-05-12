import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let stats = await prisma.paper3UserStats.findFirst({
      where: { userId: session.user.id },
    });

    if (!stats) {
      stats = await prisma.paper3UserStats.create({
        data: {
          userId,
          ...(profileId ? { examProfileId: profileId } : {}),
        },
      });
    }

    const attemptedQuestions = await prisma.paper3Attempt.count({
      where: attemptWhere,
    });

    if (attemptedQuestions > 0) {
      const conceptStats = await prisma.paper3Attempt.groupBy({
        by: ["questionId"],
        where: attemptWhere,
        _count: true,
        _sum: { marksEarned: true },
      });

      const questionIdsWithAttempts = conceptStats.map((cs) => cs.questionId);
      const questions = await prisma.paper3Question.findMany({
        where: { id: { in: questionIdsWithAttempts } },
      });

      const conceptCorrectMap = new Map<string, number>();
      const conceptTotalMap = new Map<string, number>();

      for (const cs of conceptStats) {
        const question = questions.find((q) => q.id === cs.questionId);
        if (question) {
          for (const concept of question.concepts) {
            conceptTotalMap.set(
              concept,
              (conceptTotalMap.get(concept) || 0) + 1,
            );
            if (cs.questionId) {
              const attempt = await prisma.paper3Attempt.findFirst({
                where: {
                  questionId: cs.questionId,
                  ...attemptWhere,
                  isCorrect: true,
                },
              });
              if (attempt) {
                conceptCorrectMap.set(
                  concept,
                  (conceptCorrectMap.get(concept) || 0) + 1,
                );
              }
            }
          }
        }
      }

      const weakConcepts: string[] = [];
      const strongConcepts: string[] = [];

      for (const [concept, total] of conceptTotalMap) {
        const correct = conceptCorrectMap.get(concept) || 0;
        const rate = total > 0 ? (correct / total) * 100 : 0;
        if (rate < 50) weakConcepts.push(concept);
        else if (rate >= 80) strongConcepts.push(concept);
      }

      const readinessScore =
        attemptedQuestions > 0
          ? (stats.questionsCorrect / attemptedQuestions) * 100
          : 0;

      await prisma.paper3UserStats.updateMany({
        where: { userId: session.user.id },
        data: {
          weakConcepts,
          strongConcepts,
          readinessScore,
        },
      });

      return NextResponse.json({
        stats: { ...stats, weakConcepts, strongConcepts, readinessScore },
      });
    }

    return NextResponse.json({
      stats: {
        ...stats,
        weakConcepts: [],
        strongConcepts: [],
        readinessScore: 0,
      },
    });
  } catch (error) {
    console.error("Paper3 stats GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
