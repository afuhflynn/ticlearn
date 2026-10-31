import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logUsage } from "@/lib/ai/usage";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRetryContent } from "@/lib/retries/generate";

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

    // A completed retry is terminal. A new pending row must never replace the
    // scored result, so block here before the pending check and the cap.
    const completed = await prisma.quizRetry.findFirst({
      where: { answerId, status: "completed", userId },
      select: { id: true },
    });
    if (completed) {
      return NextResponse.json(
        {
          error: "This answer already has a scored retry.",
          retryId: completed.id,
        },
        { status: 409 },
      );
    }

    // The attempt must carry its own quiz. A null quizId falls back to no
    // quiz at all: the old lookup let `undefined` match any quiz the student
    // owns and linked the retry to the wrong one.
    const attempt = answer.attempt;
    if (!attempt.quizId) {
      return NextResponse.json(
        { error: "This attempt has no quiz to link the retry to." },
        { status: 400 },
      );
    }
    const quiz = await prisma.quiz.findFirst({
      where: { id: attempt.quizId, userId },
      include: { note: true },
    });
    if (!quiz) {
      return NextResponse.json(
        { error: "This attempt has no quiz to link the retry to." },
        { status: 400 },
      );
    }
    const resolvedQuizId = quiz.id;
    const dayAgo = new Date(Date.now() - DAY_MS);

    // Reserve the retry slot inside one transaction: lock the parent answer
    // row, count that answer's retries for the day, and insert the reserved
    // row before any generation runs. Concurrent POSTs serialize on the lock,
    // so they cannot each pass the cap or each trigger generation for an
    // unreserved slot. Generation updates the reserved row afterward.
    let reserved: { id: string };
    try {
      reserved = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "quiz_attempt_answers" WHERE "id" = ${answer.id} FOR UPDATE`;
        const createsToday = await tx.quizRetry.count({
          where: { answerId, createdAt: { gte: dayAgo } },
        });
        if (createsToday >= DAILY_CAP) {
          throw new Error("retry-daily-cap");
        }
        const active = await tx.quizRetry.findFirst({
          where: { answerId, status: "pending", userId },
          orderBy: { createdAt: "desc" },
        });
        if (active && !isExpiredPending(active.createdAt)) {
          throw new Error(`retry-active:${active.id}`);
        }
        return await tx.quizRetry.create({
          data: {
            userId,
            attemptId: attempt.id,
            answerId: answer.id,
            quizId: resolvedQuizId,
            questionId: answer.questionId,
            concept: "Retry",
            sourcePages: [],
            sourceExcerpt: null,
            feedbackMd: null,
            retryQuestion: "",
            retryOptions: [],
            retryCorrectAnswer: "",
            status: "pending",
            model: "reserving",
          },
          select: { id: true },
        });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "retry-daily-cap") {
        return NextResponse.json(
          { error: "Daily retry limit reached for this answer." },
          { status: 429 },
        );
      }
      if (
        txError instanceof Error &&
        txError.message.startsWith("retry-active:")
      ) {
        return NextResponse.json(
          {
            error: "A retry is already waiting for this answer.",
            retryId: txError.message.slice("retry-active:".length),
          },
          { status: 409 },
        );
      }
      throw txError;
    }

    const questionPages = answer.quizQuestion?.sourcePages ?? [];
    let noteExcerpt = "";
    let pageContext = "No analyzed pages for this note.";
    // Pages whose descriptions actually reach the model. The model may only
    // cite included pages, so this stays empty when page data is missing.
    let validPages = new Set<number>();
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
      // Missed-question pages carry the misconception, so they go first and
      // survive truncation ahead of unrelated pages. Sort is stable, so page
      // order is preserved inside each group.
      const missed = new Set(questionPages);
      const described = pages
        .filter((page) => page.analyses.length > 0)
        .map((page) => ({
          pageNumber: page.pageNumber,
          line: `Page ${page.pageNumber}: ${page.analyses[0].description.slice(0, 400)}`,
        }))
        .sort(
          (a, b) =>
            Number(missed.has(b.pageNumber)) - Number(missed.has(a.pageNumber)),
        );
      // Fill whole lines up to the character limit and remember exactly which
      // pages made it in. Citations below may only reference included pages,
      // never pages dropped by truncation.
      const lines: string[] = [];
      let used = 0;
      const includedPages: number[] = [];
      for (const entry of described) {
        const cost = (lines.length > 0 ? 1 : 0) + entry.line.length;
        if (used + cost > 4000) break;
        lines.push(entry.line);
        used += cost;
        includedPages.push(entry.pageNumber);
      }
      if (lines.length > 0) {
        pageContext = lines.join("\n");
      }
      validPages = new Set(includedPages);
    }

    let generated: Awaited<ReturnType<typeof generateRetryContent>>;
    const started = Date.now();
    try {
      generated = await generateRetryContent({
        missedQuestion: answer.question,
        userAnswer: answer.userAnswer,
        correctAnswer: answer.correctAnswer,
        conceptHint:
          answer.quizQuestion?.question.slice(0, 200) ??
          answer.question.slice(0, 200),
        noteExcerpt,
        pageContext,
        userId,
      });
    } catch {
      await logUsage({
        userId,
        task: "retry_explain",
        modelId: "all_failed",
        latencyMs: Date.now() - started,
        errorCode: "all_failed",
      });
      // Generation (or output validation, including a leaked key in the
      // feedback) failed: mark the reserved slot failed so the review page
      // shows a plain retry control. The reserved row already counts toward
      // the daily cap.
      const failed = await prisma.quizRetry.update({
        where: { id: reserved.id },
        data: {
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
          error:
            "AI help is briefly unavailable. Please try again in a moment.",
          retryId: failed.id,
          status: "failed",
        },
        { status: 200 },
      );
    }

    const sourcePages = generated.output.sourcePages.filter((page) =>
      validPages.has(page),
    );

    const retry = await prisma.quizRetry.update({
      where: { id: reserved.id },
      data: {
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
      return NextResponse.json(
        { error: "Invalid answer id." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create retry." },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: "answerId is required." },
        { status: 400 },
      );
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
    return NextResponse.json(
      { error: "Failed to read retry." },
      { status: 500 },
    );
  }
}
