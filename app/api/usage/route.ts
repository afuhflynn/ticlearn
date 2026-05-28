import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatResetWindow, getRemainingAllowance } from "@/lib/chat-usage";
import { prisma } from "@/lib/prisma";

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

function getStartOfDay() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    const latestSubscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const noteCount = await prisma.note.count({
      where: { userId: session.user.id },
    });

    const quizCount = await prisma.quiz.count({
      where: { userId: session.user.id },
    });

    const plan = activeSubscription?.plan || "FREE";
    const currentStatus = latestSubscription?.status || "NONE";
    const previousPlan = activeSubscription
      ? null
      : latestSubscription?.plan || null;

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

    const startOfMonth = getStartOfMonth();
    const paper3ExamsThisMonth = await prisma.paper3MockAttempt.count({
      where: {
        userId: session.user.id,
        startedAt: { gte: startOfMonth },
      },
    });

    const paper3ExamsTotal = await prisma.paper3MockAttempt.count({
      where: { userId: session.user.id },
    });

    // Track blueprint-based mock attempts
    const profileId = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    }).then(u => u?.activeProfileId);

    const mocksThisWeek = profileId ? await prisma.mockAttempt.count({
      where: {
        examProfileId: profileId,
        startedAt: { gte: getStartOfWeek() },
      },
    }) : 0;

    // AI solves (questions processed via chat vision)
    const aiSolvesToday = profileId ? await prisma.question.count({
      where: {
        sourceType: "USER_UPLOADED",
        createdAt: { gte: getStartOfDay() },
      },
    }) : 0;

    const paper3Usage = getPaper3Usage(
      plan,
      paper3ExamsThisMonth,
      paper3ExamsTotal,
      limits.paper3ExamLimit,
    );

    return NextResponse.json({
      plan,
      status: currentStatus,
      previousPlan,
      limits: {
        pdfUploads: limits.pdfUploads,
        quizGenerations: limits.quizGenerations,
        aiTutorMessages: limits.aiTutorMessages,
        canAccessCommunity: limits.canAccessCommunity,
        canAccessLeaderboard: limits.canAccessLeaderboard,
        canAccessGCE: limits.canAccessGCE,
        paper3ExamLimit: limits.paper3ExamLimit,
        paper3RetakeLimit: limits.paper3RetakeLimit,
        paper3AIExamMessages: limits.paper3AIExamMessages,
        canViewCorrectAnswers: limits.canViewCorrectAnswers,
        canAccessPaper3AI: limits.canAccessPaper3AI,
        canShareResults: limits.canShareResults,
      },
      usage: {
        pdfUploads: noteCount,
        quizGenerations: quizCount,
        aiTutorMessages: chatsToday,
        paper3ExamsUsed: paper3Usage.examsUsed,
        paper3RetakesUsed: paper3Usage.retakesUsed,
      },
      chatDailyUsage: {
        used: chatsToday,
        limit: limits.aiTutorMessages,
        remaining: chatRemaining,
        resetsAt: nextResetAt.toISOString(),
        resetsInSeconds,
      },
      canUpload: canUseFeature(plan, "pdfUploads", noteCount, limits.pdfUploads),
      canGenerateQuiz: canUseFeature(plan, "quizGenerations", quizCount, limits.quizGenerations),
      canUseAIChat: canUseFeature(plan, "aiTutorMessages", chatsToday, limits.aiTutorMessages),
      canTakePaper3Exam: paper3Usage.canTakeExam,
      canRetakePaper3Exam: paper3Usage.canRetake,
      paper3Usage,
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
  const limits: Record<string, {
    pdfUploads: number;
    quizGenerations: number;
    aiTutorMessages: number;
    canAccessCommunity: boolean;
    canAccessLeaderboard: boolean;
    canAccessGCE: boolean;
    paper3ExamLimit: number;
    paper3RetakeLimit: number;
    paper3AIExamMessages: number;
    canViewCorrectAnswers: boolean;
    canAccessPaper3AI: boolean;
    canShareResults: boolean;
  }> = {
    FREE: {
      pdfUploads: 2,
      quizGenerations: 4,
      aiTutorMessages: 8,
      canAccessCommunity: false,
      canAccessLeaderboard: true,
      canAccessGCE: true,
      paper3ExamLimit: 1,
      paper3RetakeLimit: 0,
      paper3AIExamMessages: 4,
      canViewCorrectAnswers: false,
      canAccessPaper3AI: false,
      canShareResults: false,
    },
    STARTER: {
      pdfUploads: 10,
      quizGenerations: 20,
      aiTutorMessages: 50,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
      paper3ExamLimit: 3,
      paper3RetakeLimit: 0,
      paper3AIExamMessages: 4,
      canViewCorrectAnswers: false,
      canAccessPaper3AI: false,
      canShareResults: false,
    },
    STANDARD: {
      pdfUploads: 30,
      quizGenerations: 60,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
      paper3ExamLimit: 5,
      paper3RetakeLimit: 0,
      paper3AIExamMessages: -1,
      canViewCorrectAnswers: true,
      canAccessPaper3AI: false,
      canShareResults: true,
    },
    PREMIUM: {
      pdfUploads: -1,
      quizGenerations: -1,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
      paper3ExamLimit: -1,
      paper3RetakeLimit: -1,
      paper3AIExamMessages: -1,
      canViewCorrectAnswers: true,
      canAccessPaper3AI: true,
      canShareResults: true,
    },
    PRO: {
      pdfUploads: -1,
      quizGenerations: -1,
      aiTutorMessages: -1,
      canAccessCommunity: true,
      canAccessLeaderboard: true,
      canAccessGCE: true,
      paper3ExamLimit: -1,
      paper3RetakeLimit: -1,
      paper3AIExamMessages: -1,
      canViewCorrectAnswers: true,
      canAccessPaper3AI: true,
      canShareResults: true,
    },
  };

  return limits[plan] || limits.FREE;
}

function getPaper3Usage(
  plan: string,
  examsThisMonth: number,
  examsTotal: number,
  examLimit: number,
) {
  const isPremium = plan === "PREMIUM";

  let canTakeExam = false;
  let canRetake = isPremium;

  if (plan === "FREE") {
    canTakeExam = examsTotal === 0;
  } else if (isPremium) {
    canTakeExam = true;
  } else {
    canTakeExam = examLimit === -1 || examsThisMonth < examLimit;
  }

  const examsUsed = plan === "FREE" ? examsTotal : examsThisMonth;
  const retakesUsed = 0;

  return {
    examsUsed,
    examsLimit: examLimit,
    retakesUsed,
    retakesLimit: isPremium ? -1 : 0,
    remaining: examLimit === -1 ? -1 : Math.max(0, examLimit - examsThisMonth),
    canTakeExam,
    canRetake,
  };
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