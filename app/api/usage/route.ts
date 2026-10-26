import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatResetWindow, getRemainingAllowance } from "@/lib/chat-usage";
import { getEffectiveCreditCost } from "@/lib/credits";
import {
  getPlanLimits,
  limitReached,
  remainingOf,
  resolvePlan,
} from "@/lib/plan-limits";
import { getPlatformSettings } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nextResetAt, resetsInSeconds, windowStart } = getChatResetWindow();

    const [
      activeSubscription,
      latestSubscription,
      noteCount,
      quizCount,
      chatsToday,
    ] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true } } },
      }),
      prisma.subscription.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.note.count({
        where: { userId: session.user.id },
      }),
      prisma.quiz.count({
        where: { userId: session.user.id },
      }),
      prisma.chatMessage.count({
        where: {
          userId: session.user.id,
          role: "user",
          createdAt: {
            gte: windowStart,
            lt: nextResetAt,
          },
        },
      }),
    ]);

    const plan = resolvePlan(activeSubscription);
    const currentStatus = latestSubscription?.status || "NONE";
    const previousPlan = activeSubscription
      ? null
      : latestSubscription?.plan || null;

    const limits = getPlanLimits(plan);
    const chatRemaining = getRemainingAllowance(
      limits.aiTutorMessages,
      chatsToday,
    );
    const settings = await getPlatformSettings();
    const planValue = plan === "FREE" ? null : plan;
    const quizCreditCost = getEffectiveCreditCost(
      settings.creditCostQuizGeneration,
      planValue,
      settings,
    );

    return NextResponse.json({
      plan,
      status: currentStatus,
      previousPlan,
      limits: {
        pdfUploads: limits.pdfUploads,
        quizGenerations: limits.quizGenerations,
        aiTutorMessages: limits.aiTutorMessages,
        maxConversationMessages: limits.maxConversationMessages,
      },
      usage: {
        pdfUploads: noteCount,
        quizGenerations: quizCount,
        aiTutorMessages: chatsToday,
      },
      creditCosts: {
        quizGeneration: quizCreditCost,
        aiTutorMessage: settings.creditCostAiTutorMessage,
      },
      chatDailyUsage: {
        used: chatsToday,
        limit: limits.aiTutorMessages,
        remaining: chatRemaining,
        resetsAt: nextResetAt.toISOString(),
        resetsInSeconds,
      },
      canUpload: !limitReached(limits.pdfUploads, noteCount),
      canGenerateQuiz: !limitReached(limits.quizGenerations, quizCount),
      canUseAIChat: !limitReached(limits.aiTutorMessages, chatsToday),
      remainingUploads: remainingOf(limits.pdfUploads, noteCount),
    });
  } catch (error) {
    console.error("Usage GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 },
    );
  }
}
