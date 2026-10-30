import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRetryContent } from "@/lib/retries/generate";
import { logUsage } from "@/lib/ai/usage";

const bodySchema = z.object({
  answerId: z.string().min(1),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const DAILY_CAP = 3;

function isExpiredPending(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > PENDING_TTL_MS;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { answerId } = bodySchema.parse(await req.json());

    const answer = await prisma.quizAttemptAnswer.findFirst({
      where: {
        id: answerId,
        attempt: { userId },
      },
      include: {
        attempt: true,
        quizQuestion: true,
      },
    });

    if (!answer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (answer.isCorrect) {
      return NextResponse.json(
        { error: "Only missed answers can start a retry." },
        { status: 400 },
      );
    }

    const dayAgo = new Date(Date.now() - DAY_MS);
    const createsToday = await prisma.quizRetry.count({
      where: { answerId, createdAt: { gte: dayAgo } },
    });
    if (createsToday >= DAILY_CAP) {
      return NextResponse.json(
        { error: "Daily retry limit reached for this answer." },
        { status: 429 },
      );
    }

    const active = await prisma.quizRetry.findFirst({
      where: { answerId, status: "pending", userId },
      orderBy: { createdAt: "desc" },
    });
    if (active && !isExpiredPending(active.createdAt)) {
      return NextResponse.json(
        { error: "A retry is already waiting for this answer.", retryId: active.id },
        { status: 409 },
      );
    }

    const attempt = answer.attempt;
    const quiz = await prisma.quiz.findFirst({
      where: { id: attempt.quizId ?? undefined, userId },
      include: { note: true },
    });
    const resolvedQuizId = attempt.quizId ?? quiz?.id;
    if (!resolvedQuizId) {
      return NextResponse.json(
        { error: "This attempt has no quiz to link the retry to." },
        { status: 400 },
      );
    }

    const questionPages = answer.quizQuestion?.sourcePages ?? [];
    let noteExcerpt = "";
    let pageContext = "No analyzed pages for this note.";
    if (quiz?.note?.extractedText) {
      noteExcerpt = quiz.note.extractedText.slice(0, 6000);
    }
    if (quiz?.noteId) {
      const pages = await prisma.page.findMany({
        where: { noteId: quiz.noteId },
        orderBy: { pageNumber: "asc" },
        include: {
          analyses: {
            where: { status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      const described = pages
        .filter((page) => page.analyses.length > 0)
        .map(
          (page) =>
            `Page ${page.pageNumber}: ${page.analyses[0].description.slice(0, 400)}`,
        );
      if (described.length > 0) {
        pageContext = described.join("\n").slice(0, 4000);
      }
    }

    let notePageNumbers: number[] = [];
    if (quiz?.noteId) {
      const notePages = await prisma.page.findMany({
        where: { noteId: quiz.noteId },
        select: { pageNumber: true },
      });
      notePageNumbers = notePages.map((page) => page.pageNumber);
    }
    const validPages = new Set([...questionPages, ...notePageNumbers]);

    let generated;
    const started = Date.now();
    try {
      generated = await generateRetryContent({
        missedQuestion: answer.question,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
        conceptHint: answer.quizQuestion?.question.slice(0, 200) ?? answer.question.slice(0, 200),
        noteExcerpt,
        pageContext,
        userId,
      });
    } catch (error) {
      await logUsage({
        userId,
        task: "retry_explain",
        modelId: "all_failed",
        latencyMs: Date.now() - started,
        errorCode: "all_failed",
      });
      const failed = await prisma.quizRetry.create({
        data: {
          userId,
          attemptId: attempt.id,
          answerId: answer.id,
          quizId: resolvedQuizId,
          questionId: answer.questionId,
          concept: "Retry",
          sourcePages: [],
          sourceExcerpt: noteExcerpt.slice(0, 6000) || null,
          feedbackMd: null,
          retryQuestion: "Retry generation failed. Try again.",
          retryOptions: [],
          retryCorrectAnswer: "",
          status: "failed",
          model: "all_failed",
          latencyMs: Date.now() - started,
          completedAt: new Date(),
        },
      });
      return NextResponse.json(
        {
          error: "AI help is briefly unavailable. Please try again in a moment.",
          retryId: failed.id,
          status: "failed",
        },
        { status: 200 },
      );
    }

    const sourcePages = generated.output.sourcePages.filter((page) =>
      validPages.has(page),
    );

    const retry = await prisma.quizRetry.create({
      data: {
        userId,
        attemptId: attempt.id,
        answerId: answer.id,
        quizId: resolvedQuizId,
        questionId: answer.questionId,
        concept: generated.output.concept,
        sourcePages,
        sourceExcerpt: noteExcerpt.slice(0, 6000) || null,
        feedbackMd: generated.output.feedbackMd,
        retryQuestion: generated.output.retryQuestion,
        retryOptions: generated.output.retryOptions,
        retryCorrectAnswer: generated.output.retryCorrectAnswer,
        status: "pending",
        model: generated.modelId,
        latencyMs: generated.latencyMs,
      },
    });

    await logUsage({
      userId,
      task: "retry_explain",
      modelId: generated.modelId,
      latencyMs: generated.latencyMs,
    });

    return NextResponse.json(
      {
        retry: {
          id: retry.id,
          status: retry.status,
          concept: retry.concept,
          sourcePages: retry.sourcePages,
          sourceExcerpt: retry.sourceExcerpt,
          feedbackMd: retry.feedbackMd,
          retryQuestion: retry.retryQuestion,
          retryOptions: retry.retryOptions,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid answer id." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create retry." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const answerId = url.searchParams.get("answerId");
    if (!answerId) {
      return NextResponse.json({ error: "answerId is required." }, { status: 400 });
    }

    const answer = await prisma.quizAttemptAnswer.findFirst({
      where: { id: answerId, attempt: { userId: session.user.id } },
    });
    if (!answer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const retry = await prisma.quizRetry.findFirst({
      where: { answerId, userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!retry) {
      return NextResponse.json({ retry: null });
    }

    const expired =
      retry.status === "pending" && isExpiredPending(retry.createdAt);
    const status = expired ? "failed" : retry.status;
    const completed = status === "completed";

    return NextResponse.json({
      retry: {
        id: retry.id,
        status,
        concept: retry.concept,
        sourcePages: retry.sourcePages,
        sourceExcerpt: retry.sourceExcerpt,
        feedbackMd: retry.feedbackMd,
        retryQuestion: retry.retryQuestion,
        retryOptions: retry.retryOptions,
        retryCorrectAnswer: completed ? retry.retryCorrectAnswer : undefined,
        isCorrect: retry.isCorrect,
        userAnswer: retry.userAnswer,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read retry." }, { status: 500 });
  }
}
