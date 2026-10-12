import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    const profileId = await getActiveProfileId(session.user.id);
    const ownershipWhere = profileId
      ? { id: attemptId, examProfileId: profileId }
      : { id: attemptId, userId: session.user.id };

    const sub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { plan: true },
    });
    const isPremium = sub?.plan === "PREMIUM";

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: ownershipWhere,
      include: {
        mock: {
          include: {
            questions: {
              include: {
                question: {
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    contentMd: true,
                    taskType: true,
                    marks: true,
                    expectedAnswer: true,
                    explanation: true,
                    visualElements: true,
                    requireAnswer: true,
                    concepts: true,
                    section: true,
                  },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        detailedResults: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const results = attempt.results as Array<{
      questionId: string;
      isCorrect: boolean;
      marksEarned: number;
      totalMarks: number;
    }>;

    const detailedResults = attempt.detailedResults || [];

    const sectionPerformance: Record<
      string,
      { correct: number; total: number }
    > = {};
    const conceptPerformance: Record<
      string,
      { correct: number; total: number }
    > = {};

    for (const mq of attempt.mock.questions) {
      const question = mq.question;
      const section = question.section;
      const concepts = (question.concepts as string[]) || [];

      if (!sectionPerformance[section]) {
        sectionPerformance[section] = { correct: 0, total: 0 };
      }
      sectionPerformance[section].total += question.marks;

      for (const concept of concepts) {
        if (!conceptPerformance[concept]) {
          conceptPerformance[concept] = { correct: 0, total: 0 };
        }
        conceptPerformance[concept].total += question.marks;
      }
    }

    for (const result of results) {
      const mq = attempt.mock.questions.find(
        (mq) => mq.question.id === result.questionId,
      );
      if (!mq) continue;

      const question = mq.question;
      const section = question.section;
      const concepts = (question.concepts as string[]) || [];

      if (sectionPerformance[section] && result.isCorrect) {
        sectionPerformance[section].correct += result.marksEarned;
      }

      for (const concept of concepts) {
        if (conceptPerformance[concept] && result.isCorrect) {
          conceptPerformance[concept].correct += result.marksEarned;
        }
      }
    }

    const analytics = {
      bySection: Object.entries(sectionPerformance).map(([section, data]) => ({
        section,
        marks: data.correct,
        totalMarks: data.total,
        percentage:
          data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      })),
      byConcept: Object.entries(conceptPerformance).map(([concept, data]) => ({
        concept,
        marks: data.correct,
        totalMarks: data.total,
        percentage:
          data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      })),
      correctCount: results.filter((r) => r.isCorrect).length,
      incorrectCount: results.filter((r) => !r.isCorrect).length,
      partialCount: detailedResults.filter((r) => r.partialCredit).length,
    };

    return NextResponse.json({
      attempt,
      ...(isPremium ? { analytics } : {}),
    });
  } catch (error) {
    console.error("Paper3 attempt GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
