import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/paper3/evaluate";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;

    const question = await prisma.paper3Question.findUnique({
      where: { id: questionId, status: "APPROVED" },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        section: true,
        taskType: true,
        programmingLanguage: true,
        concepts: true,
        content: true,
        contentMd: true,
        marks: true,
        explanation: true,
        visualElements: true,
        taskItems: true,
        expectedAnswer: true,
        markingBreakdown: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Paper3 practice question GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const { questionId } = await params;
    const { userAnswer } = await req.json();

    if (!userAnswer) {
      return NextResponse.json(
        { error: "Answer is required" },
        { status: 400 },
      );
    }

    const question = await prisma.paper3Question.findUnique({
      where: { id: questionId, status: "APPROVED" },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    const result = await evaluateAnswer(
      {
        taskType: question.taskType,
        expectedAnswer: question.expectedAnswer,
        totalMarks: question.marks,
        partialCredit: question.partialCredit,
        markingBreakdown: question.markingBreakdown as Array<{
          criteria: string;
          marks: number;
          description: string;
        }> | undefined,
        language: question.programmingLanguage ?? undefined,
      },
      userAnswer,
    );

    const attempt = await prisma.paper3Attempt.create({
      data: {
        userId: session.user.id,
        questionId,
        userAnswer,
        isCorrect: result.isCorrect,
        marksEarned: result.marksEarned,
        totalMarks: result.totalMarks,
        feedback: result.feedback,
      },
    });

    const userStats = await prisma.paper3UserStats.findUnique({
      where: { userId: session.user.id },
    });

    if (userStats) {
      const newAttempted = userStats.questionsAttempted + 1;
      const newCorrect =
        userStats.questionsCorrect + (result.isCorrect ? 1 : 0);
      const newAvg =
        (userStats.avgScore * userStats.questionsAttempted +
          (result.marksEarned / result.totalMarks) * 100) /
        newAttempted;

      await prisma.paper3UserStats.update({
        where: { userId: session.user.id },
        data: {
          questionsAttempted: newAttempted,
          questionsCorrect: newCorrect,
          avgScore: Math.round(newAvg),
        },
      });
    } else {
      await prisma.paper3UserStats.create({
        data: {
          userId: session.user.id,
          questionsAttempted: 1,
          questionsCorrect: result.isCorrect ? 1 : 0,
          avgScore: (result.marksEarned / result.totalMarks) * 100,
        },
      });
    }

    return NextResponse.json({
      attempt,
      result,
    });
  } catch (error) {
    console.error("Paper3 answer check error:", error);
    return NextResponse.json(
      { error: "Failed to check answer" },
      { status: 500 },
    );
  }
}
