import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuizFromNote } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { getEffectiveCreditCost, getUserCreditBalance } from "@/lib/credits";
import { getPlanLimits, limitReached, resolvePlan } from "@/lib/plan-limits";
import {
  getPlatformSettings,
  quizCreditsRequired,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const weakAreaSchema = z.object({
  attemptId: z.string().min(1).optional(),
  topicText: z.string().min(2).max(200).optional(),
  count: z.number().int().min(1).max(10).optional().default(5),
  openOnly: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = weakAreaSchema.parse(await req.json());
    let topicText = body.topicText ?? "";
    let weakConcepts: string[] = [];

    if (body.attemptId) {
      const attempt = await prisma.quizAttempt.findFirst({
        where: { id: body.attemptId, userId: session.user.id },
        include: { answers: true, quiz: true },
      });
      if (!attempt) {
        return NextResponse.json(
          { error: "Attempt not found" },
          { status: 404 },
        );
      }
      const wrong = attempt.answers.filter((a) => !a.isCorrect).slice(0, 5);
      weakConcepts = wrong.map((a) => a.question.slice(0, 120));
      topicText =
        topicText ||
        (wrong.length > 0
          ? `Weak areas from ${attempt.quizTitle}: ${weakConcepts.slice(0, 2).join("; ")}`
          : `Follow up to ${attempt.quizTitle}`);
    }

    if (!topicText) {
      return NextResponse.json(
        { error: "Provide an attempt or a topic" },
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
      return NextResponse.json(
        { error: "Quiz generation limit reached." },
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
            error: "Insufficient credits.",
            balance,
            requiredCredits: quizCost,
          },
          { status: 402 },
        );
      }
    }

    const count = body.count ?? 5;
    const content = body.openOnly
      ? `Topic: ${topicText}. Write ${count} OPEN written questions only, each worth 2 to 4 marks with a mark scheme. Cameroon schools.`
      : `Topic: ${topicText}. Write ${count} harder MCQ questions on these weak points: ${weakConcepts.join("; ") || topicText}. Cameroon schools.`;
    let generated: Awaited<ReturnType<typeof generateQuizFromNote>>;
    try {
      generated = await generateQuizFromNote(
        content,
        { questionCount: count, questionTypes: body.openOnly ? "OPEN" : "MCQ" },
        session.user.id,
      );
    } catch (error) {
      console.error("[from-weak-areas] generation failed:", error);
      return NextResponse.json(
        { error: "Quiz generation failed. Try again." },
        { status: 500 },
      );
    }
    if (generated.questions.length === 0) {
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
          noteTitle: topicText.slice(0, 120),
          title: `${topicText.slice(0, 80)} (follow up)`,
          questionCount: generated.questions.length,
          status: "READY",
          isPublic: false,
          timed: false,
          timeLimit: null,
          metadata: weakConcepts.length > 0 ? { weakConcepts } : undefined,
        },
      });
      await tx.quizQuestion.createMany({
        data: generated.questions.map((q, i) => ({
          quizId: created.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          order: i + 1,
          marks: (q as { marks?: number }).marks ?? (q.type === "OPEN" ? 2 : 1),
          markSchemeMd: (q as { markSchemeMd?: string }).markSchemeMd ?? null,
          examinerNote: (q as { examinerNote?: string }).examinerNote ?? null,
        })),
      });
      return created;
    });

    const totalMarks = generated.questions.reduce(
      (sum, q) => sum + ((q as { marks?: number }).marks ?? 1),
      0,
    );

    return NextResponse.json({ quiz, success: true, totalMarks });
  } catch (error) {
    console.error("Weak area generate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz." },
      { status: 500 },
    );
  }
}
