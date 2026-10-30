import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mergeWeakArea } from "@/lib/retries/weak-areas";

const bodySchema = z.object({
  userAnswer: z.string().min(1).max(4000),
});

/** A pending retry older than this reads as failed and can no longer score. */
const PENDING_TTL_MS = 10 * 60 * 1000;

function isExpiredPending(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > PENDING_TTL_MS;
}

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

    const existing = await prisma.quizRetry.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "pending" || isExpiredPending(existing.createdAt)) {
      return NextResponse.json(
        { error: "This retry can no longer be submitted." },
        { status: 409 },
      );
    }

    const isCorrect =
      trimmed.toLowerCase() ===
      existing.retryCorrectAnswer.trim().toLowerCase();
    const completedAt = new Date();

    try {
      const submitted = await prisma.$transaction(async (tx) => {
        // Lock the quiz row before reading Quiz.metadata so two concurrent
        // submits cannot merge from the same stale snapshot.
        await tx.$queryRaw`SELECT "id" FROM "quizzes" WHERE "id" = ${existing.quizId} FOR UPDATE`;
        const quiz = await tx.quiz.findFirst({
          where: { id: existing.quizId, userId: session.user.id },
        });

        const updatedAt = new Date().toISOString();
        const weakEntry = {
          concept: existing.concept,
          sourcePages: existing.sourcePages,
          retryId: existing.id,
          isCorrect,
          updatedAt,
        };
        const mergedMetadata = mergeWeakArea(quiz?.metadata, weakEntry);

        // Claim the retry only if it is still pending. A concurrent submit
        // wins the single row update; the loser sees count zero and gets 409
        // without touching quiz metadata.
        const claimed = await tx.quizRetry.updateMany({
          where: { id: existing.id, status: "pending" },
          data: {
            status: "completed",
            isCorrect,
            userAnswer: trimmed,
            completedAt,
          },
        });
        if (claimed.count === 0) {
          throw new Error("retry-claim-lost");
        }

        if (quiz) {
          await tx.quiz.update({
            where: { id: quiz.id },
            data: {
              metadata: mergedMetadata as unknown as never,
            },
          });
        }

        return { isCorrect, mergedMetadata, hasQuiz: !!quiz };
      });

      return NextResponse.json({
        isCorrect: submitted.isCorrect,
        correctAnswer: existing.retryCorrectAnswer,
        weakAreas: (submitted.mergedMetadata as { weakAreas: unknown })
          .weakAreas,
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "retry-claim-lost") {
        return NextResponse.json(
          { error: "This retry is already completed." },
          { status: 409 },
        );
      }
      throw txError;
    }
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
