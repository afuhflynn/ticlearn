import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatResetWindow, getRemainingAllowance } from "@/lib/chat-usage";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const noteCount = await prisma.note.count({
      where: { userId: session.user.id },
    });

    const quizCount = await prisma.quiz.count({
      where: { userId: session.user.id },
    });

    const plan = subscription?.plan || "FREE";
    const planStatus = subscription?.status || "INACTIVE";

    const limits = getPlanLimits(plan);
    const { nextResetAt, resetsInSeconds, windowStart } = getChatResetWindow();
    const chatsToday = await prisma.chatMessage.count({
      where: {
        userId: session.user.id,
        role: "user",
        createdAt: {
          gte: windowStart,
          lt: nextResetAt,
        },
      },
    });
    const chatRemaining = getRemainingAllowance(
      limits.aiTutorMessages,
      chatsToday,
    );

    return NextResponse.json({
      plan,
      status: planStatus,
      limits: {
        pdfUploads: limits.pdfUploads,
        quizGenerations: limits.quizGenerations,
        aiTutorMessages: limits.aiTutorMessages,
        canAccessCommunity: limits.canAccessCommunity,
        canAccessLeaderboard: limits.canAccessLeaderboard,
        canAccessGCE: limits.canAccessGCE,
      },
      usage: {
        pdfUploads: noteCount,
        quizGenerations: quizCount,
        aiTutorMessages: chatsToday,
      },
      chatDailyUsage: {
        used: chatsToday,
        limit: limits.aiTutorMessages,
        remaining: chatRemaining,
        resetsAt: nextResetAt.toISOString(),
        resetsInSeconds,
      },
      canUpload: canUseFeature(
        plan,
        "pdfUploads",
        noteCount,
        limits.pdfUploads,
      ),
      canGenerateQuiz: canUseFeature(
        plan,
        "quizGenerations",
        quizCount,
        limits.quizGenerations,
      ),
      canUseAIChat: canUseFeature(
        plan,
        "aiTutorMessages",
        chatsToday,
        limits.aiTutorMessages,
      ),
    });
  } catch (error) {
    console.error("Usage GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 },
    );
  }
}

function getPlanLimits(plan: string) {
  const limits: Record<
    string,
    {
      pdfUploads: number;
      quizGenerations: number;
      aiTutorMessages: number;
      canAccessCommunity: boolean;
      canAccessLeaderboard: boolean;
      canAccessGCE: boolean;
    }
  > = {
    FREE: {
      pdfUploads: 2,
      quizGenerations: 4,
      aiTutorMessages: 8,
      canAccessCommunity: false,
      canAccessLeaderboard: false,
      canAccessGCE: false,
    },
    STARTER: {
      pdfUploads: 10,
      quizGenerations: 20,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
    },
    STANDARD: {
      pdfUploads: 30,
      quizGenerations: 60,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
    },
    PREMIUM: {
      pdfUploads: -1,
      quizGenerations: -1,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
    },
  };

  return limits[plan] || limits.FREE;
}

function canUseFeature(
  plan: string,
  _feature: string,
  currentUsage: number,
  limit: number,
) {
  if (plan === "PREMIUM") return true;
  if (limit === -1) return true;
  return currentUsage < limit;
}
