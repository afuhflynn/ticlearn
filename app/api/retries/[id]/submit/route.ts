import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mergeWeakArea } from "@/lib/retries/weak-areas";

const bodySchema = z.object({
  userAnswer: z.string().min(1).max(4000),
});

export async function POST(
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
    const { userAnswer } = bodySchema.parse(await req.json());
    const trimmed = userAnswer.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Answer is required." },
        { status: 400 },
      );
    }

    const retry = await prisma.quizRetry.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!retry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (retry.status === "completed") {
      return NextResponse.json(
        { error: "This retry is already completed." },
        { status: 409 },
      );
    }

    const isCorrect =
      trimmed.toLowerCase() === retry.retryCorrectAnswer.trim().toLowerCase();

    const quiz = await prisma.quiz.findFirst({
      where: { id: retry.quizId, userId: session.user.id },
    });

    const updatedAt = new Date().toISOString();
    const weakEntry = {
      concept: retry.concept,
      sourcePages: retry.sourcePages,
      retryId: retry.id,
      isCorrect,
      updatedAt,
    };

    const mergedMetadata = mergeWeakArea(quiz?.metadata, weakEntry);

    const [saved] = await prisma.$transaction([
      prisma.quizRetry.update({
        where: { id: retry.id },
        data: {
          status: "completed",
          isCorrect,
          userAnswer: trimmed,
          completedAt: new Date(),
        },
      }),
      ...(quiz
        ? [
            prisma.quiz.update({
              where: { id: quiz.id },
              data: {
                metadata: mergedMetadata as unknown as never,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      isCorrect: saved.isCorrect,
      correctAnswer: retry.retryCorrectAnswer,
      weakAreas: quiz
        ? (mergedMetadata as { weakAreas: unknown }).weakAreas
        : [weakEntry],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Answer is required." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit retry." },
      { status: 500 },
    );
  }
}
