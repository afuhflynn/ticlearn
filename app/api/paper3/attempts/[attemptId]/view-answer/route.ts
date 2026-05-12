import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(
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

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: ownershipWhere,
      include: {
        mock: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only view correct answers for completed attempts" },
        { status: 400 },
      );
    }

    if (attempt.correctAnswerViewed) {
      return NextResponse.json(
        { error: "Correct answers already viewed for this attempt" },
        { status: 400 },
      );
    }

    const correctAnswers = attempt.mock.questions.map((mq) => ({
      questionId: mq.question.id,
      questionNumber: mq.question.questionNumber,
      title: mq.question.title,
      taskType: mq.question.taskType,
      expectedAnswer: mq.question.expectedAnswer,
      explanation: mq.question.explanation,
    }));

    const updated = await prisma.paper3MockAttempt.update({
      where: { id: attemptId },
      data: { correctAnswerViewed: true },
    });

    return NextResponse.json({
      success: true,
      attempt: updated,
      correctAnswers,
    });
  } catch (error) {
    console.error("Paper3 view answer error:", error);
    return NextResponse.json(
      { error: "Failed to mark answer as viewed" },
      { status: 500 },
    );
  }
}