import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { trackEvent, EVENTS } from "@/lib/kpi";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const exam = await prisma.examSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ exam });
  } catch (error) {
    console.error("Exam GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { answers, timeTaken } = await req.json();

    const exam = await prisma.examSession.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const questions = exam.questions as unknown as Array<{
      id: string;
      correctAnswer: string;
    }>;

    let correctCount = 0;
    const gradedAnswers = [];

    for (const answer of answers || []) {
      const question = questions.find(
        (q: { id: string }) => q.id === answer.questionId,
      );
      if (!question) continue;

      const isCorrect = answer.answer === question.correctAnswer;
      if (isCorrect) correctCount++;

      gradedAnswers.push({
        questionId: answer.questionId,
        userAnswer: answer.answer,
        isCorrect,
      });
    }

    const score =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

    const updatedExam = await prisma.examSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        score,
        timeTaken,
        answers: gradedAnswers as unknown as any,
      },
    });

    trackEvent(session.user.id, EVENTS.EXAM_COMPLETED, {
      subject: exam.subject,
      score,
    }).catch(() => {});

    return NextResponse.json({ exam: updatedExam, success: true });
  } catch (error) {
    console.error("Exam submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit exam" },
      { status: 500 },
    );
  }
}
