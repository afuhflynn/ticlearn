import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuizFromNote } from "@/lib/ai/index";
import type { normalizeGeneratedQuestions } from "@/lib/ai/validators";
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

const wizardGenerateSchema = z.object({
  topicText: z.string().min(2).max(200),
  noteId: z.string().min(1).nullable().optional(),
  levelChoice: z.enum(["GCE", "HND", "PROF", "MIXED"]),
  formatChoice: z.string().min(2).max(80),
  count: z.number().int().min(1).max(10),
  difficulty: z.enum(["STANDARD", "HARD", "MIXED"]),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = wizardGenerateSchema.parse(await req.json());
    const topicText = body.topicText.trim();
    const levelChoice = body.levelChoice;
    const formatChoice = body.formatChoice;
    const count = body.count;
    const difficulty = body.difficulty;

    let note: { id: string; title: string } | null = null;
    if (body.noteId) {
      note = await prisma.note.findFirst({
        where: { id: body.noteId, userId: session.user.id },
        select: { id: true, title: true },
      });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
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
      return NextResponse.json(
        {
          error: `Quiz generation limit reached (${quizLimit}). Upgrade to generate more quizzes.`,
        },
        { status: 403 },
      );
    }

    const settings = await getPlatformSettings();
    const wantsDebit = quizCreditsRequired(settings);
    const planValue = plan === "FREE" ? null : plan;
    const quizCost = getEffectiveCreditCost(
      settings.creditCostQuizGeneration,
      planValue,
      settings,
    );
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

    const title = `${topicText} (${levelChoice}, ${count})`;
    const noteTitle = note?.title ?? topicText;

    // A linked note reuses the page pipeline exactly: a GENERATING row plus
    // the Inngest job, so counts plus caps plus debits match the quiz page.
    if (note) {
      const full = await prisma.note.findFirst({
        where: { id: note.id, userId: session.user.id },
        select: { id: true, status: true, extractedText: true },
      });
      if (!full || full.status !== "READY" || !full.extractedText) {
        return NextResponse.json(
          {
            error:
              "Note is not ready for quiz generation. Please wait for processing to complete.",
          },
          { status: 400 },
        );
      }
      const quiz = await prisma.quiz.create({
        data: {
          userId: session.user.id,
          noteId: note.id,
          noteTitle,
          title,
          questionCount: 0,
          status: "GENERATING",
          isPublic: false,
          timed: false,
          timeLimit: null,
        },
      });
      try {
        await inngest.send({
          name: "quiz/generate",
          data: {
            noteId: note.id,
            quizId: quiz.id,
            questionCount: count,
            questionTypes: "MIXED",
            wantsDebit,
            quizCost,
            userId: session.user.id,
            noteTitle,
            grounded: false,
          },
        });
      } catch (inngestError) {
        console.error("Inngest send error:", inngestError);
      }
      trackEvent(session.user.id, EVENTS.QUIZ_GENERATED, {
        noteId: note.id,
        questionCount: count,
      }).catch(() => {});
      return NextResponse.json({ quiz, success: true, status: "GENERATING" });
    }

    // Text only mode builds from the topic the student typed. It writes the
    // same quiz rows as the page so history stays in one place.
    const content = `Topic: ${topicText}. Level: ${levelChoice}. Format: ${formatChoice}. Difficulty: ${difficulty}. Teach and quiz this topic for Cameroon schools.`;
    let questions: ReturnType<typeof normalizeGeneratedQuestions> = [];
    try {
      const generated = await generateQuizFromNote(
        content,
        { questionCount: count, questionTypes: "MIXED" },
        session.user.id,
      );
      questions = generated.questions;
    } catch (error) {
      console.error("[wizard-generate] model generation failed:", error);
      return NextResponse.json(
        { error: "Quiz generation failed. Try again." },
        { status: 500 },
      );
    }
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz generation failed. Try again." },
        { status: 500 },
      );
    }

    const quiz = await prisma.$transaction(async (tx) => {
      const created = await tx.quiz.create({
        data: {
          userId: session.user.id,
          noteId: null,
          noteTitle,
          title,
          questionCount: questions.length,
          status: "READY",
          isPublic: false,
          timed: false,
          timeLimit: null,
        },
      });
      await tx.quizQuestion.createMany({
        data: questions.map((q, i) => ({
          quizId: created.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          order: i + 1,
        })),
      });
      return created;
    });

    if (wantsDebit) {
      try {
        await spendCredits({
          userId: session.user.id,
          amount: quizCost,
          type: "QUIZ_GENERATION",
          description: `Quiz from chat wizard: ${title}`,
          referenceId: quiz.id,
        });
      } catch (err) {
        console.error("[wizard-generate] Credit debit failed:", err);
      }
    }

    trackEvent(session.user.id, EVENTS.QUIZ_GENERATED, {
      noteId: null,
      questionCount: count,
    }).catch(() => {});
    return NextResponse.json({ quiz, success: true, status: "READY" });
  } catch (error) {
    console.error("Wizard generate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid wizard input" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz." },
      { status: 500 },
    );
  }
}
