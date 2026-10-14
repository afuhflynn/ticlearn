import { prisma } from "./prisma";

export const EVENTS = {
  SIGNED_UP: "user_signed_up",
  SIGNED_IN: "user_signed_in",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  REFERRAL_CLICK: "referral_click",
  NOTE_UPLOADED: "note_uploaded",
  QUIZ_TAKEN: "quiz_taken",
  QUIZ_GENERATED: "quiz_generated",
  EXAM_COMPLETED: "exam_completed",
  CHAT_MESSAGE: "chat_message_sent",
  PAPER3_EXAM_COMPLETED: "paper3_exam_completed",
  PRACTICE_ANSWERED: "practice_question_answered",
  PAYMENT_INITIATED: "payment_initiated",
  SUBSCRIPTION_ACTIVATED: "subscription_activated",
  ONBOARDING_COMPLETED: "onboarding_completed",
  DAILY_FOCUS_DRILL: "daily_focus_drill_completed",
  RECOVERY_DRILL: "recovery_drill_completed",
} as const;

export async function trackEvent(
  userId: string,
  event: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.kpiEvent.create({
    data: {
      userId,
      event,
      metadata: (metadata ?? {}) as never,
    },
  });
}

async function countEventsByType(
  startOfDay: Date,
  endOfDay: Date,
  event: string,
) {
  return prisma.kpiEvent.count({
    where: {
      event,
      createdAt: { gte: startOfDay, lte: endOfDay },
      user: { role: "USER" },
    },
  });
}

function getDateRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function computeDailyMetrics(date: Date) {
  const { start, end } = getDateRange(date);

  const [activeUsers, feedbacks, paidUsers, totalUsers, newUsers, newPaid] =
    await Promise.all([
      prisma.kpiEvent.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: start, lte: end }, user: { role: "USER" } },
      }),
      prisma.feedback.count({
        where: { createdAt: { gte: start, lte: end }, user: { role: "USER" } },
      }),
      prisma.subscription.count({
        where: { status: "ACTIVE", user: { role: "USER" } },
      }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({
        where: { role: "USER", createdAt: { gte: start, lte: end } },
      }),
      prisma.subscription.count({
        where: {
          status: "ACTIVE",
          activatedAt: { gte: start, lte: end },
          user: { role: "USER" },
        },
      }),
    ]);

  const revenueAgg = await prisma.subscription.aggregate({
    _sum: { amount: true },
    where: {
      status: "ACTIVE",
      activatedAt: { gte: start, lte: end },
      user: { role: "USER" },
    },
  });

  const [
    chatMessages,
    quizzesTaken,
    examsCompleted,
    paper3Completed,
    practiceAnswered,
  ] = await Promise.all([
    countEventsByType(start, end, EVENTS.CHAT_MESSAGE),
    countEventsByType(start, end, EVENTS.QUIZ_TAKEN),
    countEventsByType(start, end, EVENTS.EXAM_COMPLETED),
    countEventsByType(start, end, EVENTS.PAPER3_EXAM_COMPLETED),
    countEventsByType(start, end, EVENTS.PRACTICE_ANSWERED),
  ]);

  const sevenDaysAgo = new Date(start);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(start);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [silentChurn7d, silentChurn30d] = await Promise.all([
    prisma.user.count({
      where: {
        role: "USER",
        kpiEvents: {
          some: { createdAt: { lt: sevenDaysAgo } },
          none: { createdAt: { gte: sevenDaysAgo, lte: end } },
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        kpiEvents: {
          some: { createdAt: { lt: thirtyDaysAgo } },
          none: { createdAt: { gte: thirtyDaysAgo, lte: end } },
        },
      },
    }),
  ]);

  const metrics: Array<{ metric: string; value: number }> = [
    { metric: "active_users", value: activeUsers.length },
    { metric: "feedbacks", value: feedbacks },
    { metric: "paid_users", value: paidUsers },
    { metric: "new_users", value: newUsers },
    { metric: "new_paid_users", value: newPaid },
    { metric: "revenue", value: revenueAgg._sum.amount ?? 0 },
    { metric: "chat_messages", value: chatMessages },
    { metric: "quizzes_taken", value: quizzesTaken },
    { metric: "exams_completed", value: examsCompleted },
    { metric: "paper3_completed", value: paper3Completed },
    { metric: "practice_answered", value: practiceAnswered },
    {
      metric: "conversion_rate",
      value: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0,
    },
    { metric: "silent_churn_7d", value: silentChurn7d },
    { metric: "silent_churn_30d", value: silentChurn30d },
  ];

  for (const m of metrics) {
    await prisma.dailyMetric.upsert({
      where: { date_metric: { date: start, metric: m.metric } },
      update: { autoValue: m.value },
      create: { date: start, metric: m.metric, autoValue: m.value },
    });
  }

  return metrics;
}

export interface CohortRetentionRow {
  cohort: string;
  cohortSize: number;
  week0: number;
  week1: number;
  week2: number;
  week4: number;
  week8: number;
}

export async function computeCohortRetention(): Promise<CohortRetentionRow[]> {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const userEvents = await prisma.kpiEvent.groupBy({
    by: ["userId"],
    where: {
      userId: { in: users.map((u) => u.id) },
    },
    _count: true,
  });

  const userEventSet = new Set(userEvents.map((e) => e.userId));

  const cohorts = new Map<
    string,
    { users: Array<{ id: string; createdAt: Date }> }
  >();

  for (const user of users) {
    if (!userEventSet.has(user.id)) continue;
    const d = new Date(user.createdAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const key = weekStart.toISOString().split("T")[0];
    if (!cohorts.has(key)) cohorts.set(key, { users: [] });
    cohorts.get(key)!.users.push(user);
  }

  const sortedCohorts = Array.from(cohorts.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);

  const rows: CohortRetentionRow[] = [];

  for (const [cohortKey, { users: cohortUsers }] of sortedCohorts) {
    if (cohortUsers.length < 3) continue;

    const cohortStart = new Date(cohortKey);
    const weekIntervals = [0, 1, 2, 4, 8];
    const counts: number[] = [];

    for (const weeks of weekIntervals) {
      const wStart = new Date(cohortStart);
      wStart.setDate(wStart.getDate() + weeks * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);

      if (wEnd > now) {
        counts.push(-1);
        continue;
      }

      const activeInWeek = await prisma.kpiEvent.groupBy({
        by: ["userId"],
        where: {
          userId: { in: cohortUsers.map((u) => u.id) },
          createdAt: { gte: wStart, lt: wEnd },
        },
      });

      counts.push(activeInWeek.length);
    }

    rows.push({
      cohort: cohortKey,
      cohortSize: cohortUsers.length,
      week0: counts[0],
      week1: counts[1],
      week2: counts[2],
      week4: counts[3],
      week8: counts[4],
    });
  }

  return rows;
}

export async function computeMasteryMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const performances = await prisma.topicPerformance.findMany({
    where: { lastUpdated: { gte: thirtyDaysAgo } },
    select: { masteryScore: true, lastUpdated: true, id: true },
    orderBy: { lastUpdated: "desc" },
  });

  const scores = performances.map((p) => p.masteryScore);
  const avgMastery =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const previousPeriod = await prisma.topicPerformance.findMany({
    where: { lastUpdated: { lt: thirtyDaysAgo } },
    select: { masteryScore: true },
  });
  const prevScores = previousPeriod.map((p) => p.masteryScore);
  const prevAvg =
    prevScores.length > 0
      ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
      : 50;

  const improvement =
    prevAvg > 0 ? ((avgMastery - prevAvg) / prevAvg) * 100 : 0;

  const recoveryDrills = await prisma.kpiEvent.count({
    where: {
      event: EVENTS.RECOVERY_DRILL,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  return {
    avgMastery: Math.round(avgMastery * 100) / 100,
    previousAvgMastery: Math.round(prevAvg * 100) / 100,
    improvementRate: Math.round(improvement * 100) / 100,
    recoveryDrillsCompleted: recoveryDrills,
  };
}

export interface SubjectDistribution {
  subject: string;
  activeUsers: number;
}

export async function computeSubjectDistribution(
  date: Date,
): Promise<SubjectDistribution[]> {
  const { start, end } = getDateRange(date);

  const activeUserIds = await prisma.kpiEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start, lte: end }, user: { role: "USER" } },
  });

  if (activeUserIds.length === 0) return [];

  const userIds = activeUserIds.map((u) => u.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { levelOfStudy: true },
  });

  const levelCount = new Map<string, number>();
  for (const u of users) {
    const name = u.levelOfStudy ?? "Unset";
    levelCount.set(name, (levelCount.get(name) ?? 0) + 1);
  }

  return Array.from(levelCount.entries())
    .map(([subject, activeUsers]) => ({ subject, activeUsers }))
    .sort((a, b) => b.activeUsers - a.activeUsers);
}

export async function computeMRR() {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", user: { role: "USER" } },
    select: { amount: true, plan: true },
  });

  const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0);

  const byPlan: Record<string, number> = {};
  for (const s of activeSubs) {
    byPlan[s.plan] = (byPlan[s.plan] ?? 0) + s.amount;
  }

  return { mrr, byPlan, totalSubscribers: activeSubs.length };
}

export async function computeActivationFunnel() {
  const signedUp = await prisma.user.count({ where: { role: "USER" } });
  const onboardingSkipped = await prisma.user.count({
    where: {
      role: "USER",
      onboardingSkipped: true,
    },
  });
  const onboardingCompleted = await prisma.user.count({
    where: {
      role: "USER",
      onboardingCompleted: true,
    },
  });
  const firstQuiz = await prisma.quiz.groupBy({
    by: ["userId"],
    where: { user: { role: "USER" } },
    _count: true,
  });
  const cameBack = await prisma.kpiEvent.groupBy({
    by: ["userId"],
    where: { event: EVENTS.SIGNED_IN, user: { role: "USER" } },
    _count: true,
  });

  return {
    signedUp,
    onboardingStarted: signedUp,
    onboardingCompleted,
    firstQuizTaken: firstQuiz.length,
    returnedAfterOnboarding: cameBack.length,
  };
}
