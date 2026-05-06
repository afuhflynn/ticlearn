import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let stats = await prisma.paper3UserStats.findUnique({
      where: { userId: session.user.id },
    });

    if (!stats) {
      stats = await prisma.paper3UserStats.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    const attemptedQuestions = await prisma.paper3Attempt.count({
      where: { userId: session.user.id },
    });

    if (attemptedQuestions > 0) {
      const conceptStats = await prisma.paper3Attempt.groupBy({
        by: ["questionId"],
        where: { userId: session.user.id },
        _count: true,
        _sum: {
          marksEarned: true,
        },
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
            const currentTotal = conceptTotalMap.get(concept) || 0;
            const currentCorrect = conceptCorrectMap.get(concept) || 0;
            conceptTotalMap.set(concept, currentTotal + 1);
            if (cs.questionId) {
              const attempt = await prisma.paper3Attempt.findFirst({
                where: {
                  questionId: cs.questionId,
                  userId: session.user.id,
                  isCorrect: true,
                },
              });
              if (attempt) {
                conceptCorrectMap.set(concept, currentCorrect + 1);
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
        if (rate < 50) {
          weakConcepts.push(concept);
        } else if (rate >= 80) {
          strongConcepts.push(concept);
        }
      }

      const readinessScore =
        attemptedQuestions > 0
          ? (stats.questionsCorrect / attemptedQuestions) * 100
          : 0;

      await prisma.paper3UserStats.update({
        where: { userId: session.user.id },
        data: {
          weakConcepts,
          strongConcepts,
          readinessScore,
        },
      });

      return NextResponse.json({
        stats: {
          ...stats,
          weakConcepts,
          strongConcepts,
          readinessScore,
        },
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
