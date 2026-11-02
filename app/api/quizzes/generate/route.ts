import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getEffectiveCreditCost,
  getUserCreditBalance,
  spendCredits,
} from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { EVENTS, trackEvent } from "@/lib/kpi";
import { getPlanLimits, limitReached, resolvePlan } from "@/lib/plan-limits";
import {
  getPlatformSettings,
  quizCreditsRequired,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const generateQuizSchema = z.object({
  noteId: z.string().min(1),
  questionCount: z.number().int().min(1).max(40).optional(),
  questionTypes: z.enum(["MCQ", "OPEN", "MIXED"]).optional(),
  timed: z.boolean().optional(),
  timeLimit: z.number().int().min(1).max(180).nullable().optional(),
  isPublic: z.boolean().optional(),
  grounded: z.boolean().optional(),
  source: z.enum(["page", "chat"]).optional(),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      noteId,
      questionCount,
      questionTypes,
      timed,
      timeLimit,
      isPublic,
      grounded,
    } = generateQuizSchema.parse(await req.json());

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.status !== "READY" || !note.extractedText) {
      return NextResponse.json(
        {
          error:
            "Note is not ready for quiz generation. Please wait for processing to complete.",
        },
        { status: 400 },
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const plan = resolvePlan(subscription);
    const quizLimit = getPlanLimits(plan).quizGenerations;
    const quizCount = await prisma.quiz.count({
      where: { userId: session.user.id },
    });

    if (limitReached(quizLimit, quizCount)) {
      trackEvent(session.user.id, EVENTS.LIMIT_HIT, {
        surface: "quiz",
        kind: "quiz_limit",
        used: quizCount,
        cap: quizLimit,
      }).catch(() => {});
      return NextResponse.json(
        {
          error: `Quiz generation limit reached (${quizLimit}). Upgrade to generate more quizzes.`,
          code: "UPGRADE_REQUIRED",
          used: quizCount,
          cap: quizLimit,
        },
        { status: 403 },
      );
    }

    const settings = await getPlatformSettings();
    const wantsDebit = quizCreditsRequired(settings);
    const planValue = plan === "FREE" ? null : plan;
    const resolvedQuestionCount = Math.min(questionCount ?? 10, 40);
    if (resolvedQuestionCount < 1) {
      return NextResponse.json(
        { error: "Ask for at least 1 question and at most 40." },
        { status: 400 },
      );
    }
    const isGrounded = grounded === true;
    const baseCost = isGrounded
      ? settings.creditCostGroundedQuestion * resolvedQuestionCount
      : settings.creditCostQuizGeneration;
    const quizCost = getEffectiveCreditCost(baseCost, planValue, settings);

    if (wantsDebit) {
      const balance = await getUserCreditBalance(session.user.id);
      if (balance < quizCost) {
        return NextResponse.json(
          {
            error: `Insufficient credits. Need ${quizCost} credits to generate a quiz.`,
            balance,
            requiredCredits: quizCost,
          },
          { status: 402 },
        );
      }
    }

    const resolvedQuestionTypes = questionTypes || "MIXED";

    const buildStartedAt = new Date();
    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        noteId: noteId || null,
        noteTitle: note.title,
        title: `Quiz - ${note.title}`,
        questionCount: 0,
        status: "GENERATING",
        buildStage: "QUEUED",
        builtCount: 0,
        buildTotal: resolvedQuestionCount,
        buildError: null,
        buildStartedAt,
        isPublic: isPublic || false,
        timed: timed || false,
        timeLimit: timeLimit || null,
      },
    });

    if (wantsDebit) {
      try {
        await spendCredits({
          userId: session.user.id,
          amount: quizCost,
          type: "QUIZ_GENERATION",
          description: `Quiz reserve: ${note.title}`,
          referenceId: quiz.id,
        });
      } catch (reserveError) {
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: {
            status: "ERROR",
            buildStage: null,
            buildError: "Quiz build failed.",
          },
        });
        if (
          reserveError instanceof Error &&
          /insufficient credits/i.test(reserveError.message)
        ) {
          return NextResponse.json(
            {
              error: `Insufficient credits. Need ${quizCost} credits to generate a quiz.`,
              balance: await getUserCreditBalance(session.user.id),
              requiredCredits: quizCost,
            },
            { status: 402 },
          );
        }
        throw reserveError;
      }
    }

    try {
      await inngest.send({
        name: "quiz/generate",
        data: {
          noteId,
          quizId: quiz.id,
          questionCount: resolvedQuestionCount,
          questionTypes: resolvedQuestionTypes,
          wantsDebit,
          quizCost,
          userId: session.user.id,
          noteTitle: note.title,
          grounded: isGrounded,
        },
      });
    } catch (inngestError) {
      console.error("Inngest send error:", inngestError);
    }

    trackEvent(session.user.id, EVENTS.QUIZ_GENERATED, {
      noteId,
      questionCount: resolvedQuestionCount,
    }).catch(() => {});

    return NextResponse.json({ quiz, success: true, status: "GENERATING" });
  } catch (error) {
    console.error("Quiz generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid quiz configuration" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
