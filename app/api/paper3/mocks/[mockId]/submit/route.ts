import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/paper3/evaluate";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const { mockId } = await params;
    const { attemptId, answers, timeTaken } = await req.json();

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!mock) {
      return NextResponse.json(
        { error: "Mock exam not found" },
        { status: 404 },
      );
    }

    const results: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      marksEarned: number;
      totalMarks: number;
    }> = [];
    let totalEarned = 0;

    for (const mq of mock.questions) {
      const userAnswer = answers[mq.question.id] || "";
      const result = await evaluateAnswer(
        {
          taskType: mq.question.taskType,
          expectedAnswer: mq.question.expectedAnswer,
          totalMarks: mq.marks,
          partialCredit: mq.question.partialCredit,
          markingBreakdown: mq.question.markingBreakdown as Array<{
            criteria: string;
            marks: number;
            description: string;
          }> | undefined,
          language: mq.question.programmingLanguage ?? undefined,
        },
        userAnswer,
      );

      results.push({
        questionId: mq.question.id,
        userAnswer,
        isCorrect: result.isCorrect,
        marksEarned: result.marksEarned,
        totalMarks: result.totalMarks,
      });

      totalEarned += result.marksEarned;
    }

    const score = (totalEarned / mock.totalMarks) * 100;

    const completedAttempt = await prisma.paper3MockAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        timeTaken,
        answers,
        results,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const existingStats = await prisma.paper3UserStats.findUnique({
      where: { userId: session.user.id },
    });

    if (existingStats) {
      const newExamsTaken = existingStats.mockExamsTaken + 1;
      const newAvg =
        (existingStats.avgScore * existingStats.mockExamsTaken + score) /
        newExamsTaken;

      await prisma.paper3UserStats.update({
        where: { userId: session.user.id },
        data: {
          mockExamsTaken: newExamsTaken,
          avgScore: Math.round(newAvg),
        },
      });
    } else {
      await prisma.paper3UserStats.create({
        data: {
          userId: session.user.id,
          mockExamsTaken: 1,
          avgScore: score,
        },
      });
    }

    return NextResponse.json({
      attempt: completedAttempt,
      results,
      totalEarned,
      score,
    });
  } catch (error) {
    console.error("Paper3 mock submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit exam" },
      { status: 500 },
    );
  }
}
