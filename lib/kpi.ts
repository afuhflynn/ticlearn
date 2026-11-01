import { prisma } from "./prisma";

export const EVENTS = {
  SIGNED_UP: "user_signed_up",
  SIGNED_IN: "user_signed_in",
  REFERRAL_CLICK: "referral_click",
  NOTE_UPLOADED: "note_uploaded",
  QUIZ_TAKEN: "quiz_taken",
  QUIZ_GENERATED: "quiz_generated",
  EXAM_COMPLETED: "exam_completed",
  CHAT_MESSAGE: "chat_message_sent",
  PRACTICE_ANSWERED: "practice_question_answered",
  PAYMENT_INITIATED: "payment_initiated",
  SUBSCRIPTION_ACTIVATED: "subscription_activated",
  LIMIT_HIT: "limit_hit",
  PROMPT_SHOWN: "prompt_shown",
  PROMPT_CLICKED: "prompt_clicked",
  PROMPT_DISMISSED: "prompt_dismissed",
  UPGRADE_START: "upgrade_start",
  PAID_SUCCESS: "paid_success",
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

export async function countDistinctActiveUsers(
  start: Date,
  end: Date,
): Promise<number> {
  // Daily and monthly active users as COUNT DISTINCT over user id in the
  // database, over all events inside server local day boundaries.
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(DISTINCT k."user_id")::int AS count
    FROM "kpi_events" k
    INNER JOIN "users" u ON u."id" = k."user_id"
    WHERE u."role" = 'USER'
      AND k."createdAt" >= ${start} AND k."createdAt" <= ${end}
  `;
  return rows[0]?.count ?? 0;
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

  const [activeUsers, paidUsers, totalUsers, newUsers, newPaid] =
    await Promise.all([
      prisma.kpiEvent.groupBy({
        by: ["userId"],
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

  const [chatMessages, quizzesTaken, examsCompleted, practiceAnswered] =
    await Promise.all([
      countEventsByType(start, end, EVENTS.CHAT_MESSAGE),
      countEventsByType(start, end, EVENTS.QUIZ_TAKEN),
      countEventsByType(start, end, EVENTS.EXAM_COMPLETED),
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
    { metric: "paid_users", value: paidUsers },
    { metric: "new_users", value: newUsers },
    { metric: "new_paid_users", value: newPaid },
    { metric: "revenue", value: revenueAgg._sum.amount ?? 0 },
    { metric: "chat_messages", value: chatMessages },
    { metric: "quizzes_taken", value: quizzesTaken },
    { metric: "exams_completed", value: examsCompleted },
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

  await snapshotCohortMetrics(start);

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
  // Reads stored cohort snapshot rows, never live events. Rows are keyed
  // cohort:<week>:w<offset> plus cohort:<week>:size and are written by
  // snapshotCohortMetrics during the daily compute. Latest snapshot wins.
  const rows = await prisma.dailyMetric.findMany({
    where: { metric: { startsWith: "cohort:" } },
    orderBy: [{ date: "desc" }],
    take: 500,
  });

  const seen = new Set<string>();
  const byCohort = new Map<
    string,
    { size: number; weeks: Map<string, number> }
  >();

  for (const row of rows) {
    if (seen.has(row.metric)) continue;
    seen.add(row.metric);
    const parts = row.metric.split(":");
    if (parts.length !== 3) continue;
    const key = parts[1];
    const tail = parts[2];
    let entry = byCohort.get(key);
    if (!entry) {
      entry = { size: 0, weeks: new Map() };
      byCohort.set(key, entry);
    }
    if (tail === "size") {
      entry.size = Math.round(row.autoValue ?? 0);
    } else if (tail.startsWith("w")) {
      entry.weeks.set(tail, Math.round(row.autoValue ?? 0));
    }
  }

  return Array.from(byCohort.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .filter(([, e]) => e.size >= 3)
    .map(([cohort, e]) => ({
      cohort,
      cohortSize: e.size,
      week0: e.weeks.get("w0") ?? -1,
      week1: e.weeks.get("w1") ?? -1,
      week2: e.weeks.get("w2") ?? -1,
      week4: e.weeks.get("w4") ?? -1,
      week8: e.weeks.get("w8") ?? -1,
    }));
}

const COHORT_OFFSETS = [0, 1, 2, 4, 8];

function sundayStart(d: Date): Date {
  const out = new Date(d);
  out.setDate(d.getDate() - d.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}

async function countCohortActive(
  cohortStart: Date,
  cohortEnd: Date,
  windowStart: Date,
  windowEnd: Date,
): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(DISTINCT k."user_id")::int AS count
    FROM "kpi_events" k
    INNER JOIN "users" u ON u."id" = k."user_id"
    WHERE u."role" = 'USER'
      AND u."createdAt" >= ${cohortStart} AND u."createdAt" < ${cohortEnd}
      AND k."createdAt" >= ${windowStart} AND k."createdAt" < ${windowEnd}
  `;
  return rows[0]?.count ?? 0;
}

export async function snapshotCohortMetrics(snapshotDay: Date) {
  // Bounded writer for the stored cohort rows the retention read serves.
  // Twelve recent cohorts, only windows that fully elapsed, one distinct
  // count per window through the KpiEvent composites.
  const day = new Date(snapshotDay);
  day.setHours(0, 0, 0, 0);
  const thisWeek = sundayStart(day);

  for (let w = 0; w < 12; w++) {
    const cohortStart = new Date(thisWeek);
    cohortStart.setDate(cohortStart.getDate() - w * 7);
    const cohortEnd = new Date(cohortStart);
    cohortEnd.setDate(cohortEnd.getDate() + 7);
    const key = cohortStart.toISOString().split("T")[0];

    const size = await prisma.user.count({
      where: {
        role: "USER",
        createdAt: { gte: cohortStart, lt: cohortEnd },
      },
    });
    await prisma.dailyMetric.upsert({
      where: { date_metric: { date: day, metric: `cohort:${key}:size` } },
      update: { autoValue: size },
      create: { date: day, metric: `cohort:${key}:size`, autoValue: size },
    });

    for (const offset of COHORT_OFFSETS) {
      const windowStart = new Date(cohortStart);
      windowStart.setDate(windowStart.getDate() + offset * 7);
      const windowEnd = new Date(windowStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      if (windowEnd > day) continue;
      const active = await countCohortActive(
        cohortStart,
        cohortEnd,
        windowStart,
        windowEnd,
      );
      const metric = `cohort:${key}:w${offset}`;
      await prisma.dailyMetric.upsert({
        where: { date_metric: { date: day, metric } },
        update: { autoValue: active },
        create: { date: day, metric, autoValue: active },
      });
    }
  }
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
    take: 5000,
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
  // Current active base with no renewal math: one grouped sum of amount
  // over subscriptions with status ACTIVE by plan, straight in the database.
  const groups = await prisma.subscription.groupBy({
    by: ["plan"],
    where: { status: "ACTIVE", user: { role: "USER" } },
    _sum: { amount: true },
    _count: true,
  });

  let mrr = 0;
  let totalSubscribers = 0;
  const byPlan: Record<string, number> = {};
  for (const g of groups) {
    const subtotal = g._sum.amount ?? 0;
    mrr += subtotal;
    totalSubscribers += g._count;
    byPlan[g.plan] = subtotal;
  }

  return { mrr, byPlan, totalSubscribers };
}

export async function computeActivationFunnel() {
  const signedUp = await prisma.user.count({ where: { role: "USER" } });
  const _onboardingSkipped = await prisma.user.count({
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

/** When fallback logging started, shown when a window has no search rows. */
export const FALLBACK_LOG_NOTE =
  "Fallback logging started 26 Oct 2026. Windows before that show zero.";

function inWindow(d: Date, from: Date, to: Date) {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export interface ConversionFunnel {
  signup: number;
  firstNote: number;
  firstTipAnswer: number;
  firstQuiz: number;
  firstLimitHit: number;
  firstUpgradeStart: number;
  completedPurchases: number;
  paidSuccessCheck: number;
}

export async function computeConversionFunnel(
  from: Date,
  to: Date,
): Promise<ConversionFunnel> {
  const userWhere = { role: "USER" as const };
  const [
    signup,
    noteGroups,
    quizGroups,
    tipGroups,
    limitGroups,
    upgradeGroups,
    paidGroups,
    activeSubs,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        ...userWhere,
        emailVerified: true,
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.note.groupBy({
      by: ["userId"],
      where: { user: userWhere },
      _min: { createdAt: true },
    }),
    prisma.quiz.groupBy({
      by: ["userId"],
      where: { user: userWhere },
      _min: { createdAt: true },
    }),
    prisma.chatMessage.groupBy({
      by: ["userId"],
      where: { user: userWhere, role: "assistant" },
      _min: { createdAt: true },
    }),
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: {
        event: EVENTS.LIMIT_HIT,
        createdAt: { gte: from, lte: to },
        user: userWhere,
      },
    }),
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: {
        event: EVENTS.UPGRADE_START,
        createdAt: { gte: from, lte: to },
        user: userWhere,
      },
    }),
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: {
        event: EVENTS.PAID_SUCCESS,
        createdAt: { gte: from, lte: to },
        user: userWhere,
      },
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        activatedAt: { gte: from, lte: to },
        user: userWhere,
      },
    }),
  ]);

  const firstNote = noteGroups.filter(
    (g) => g._min.createdAt && inWindow(g._min.createdAt, from, to),
  ).length;
  const firstQuiz = quizGroups.filter(
    (g) => g._min.createdAt && inWindow(g._min.createdAt, from, to),
  ).length;
  const firstTipAnswer = tipGroups.filter(
    (g) => g._min.createdAt && inWindow(g._min.createdAt, from, to),
  ).length;

  return {
    signup,
    firstNote,
    firstTipAnswer,
    firstQuiz,
    firstLimitHit: limitGroups.length,
    firstUpgradeStart: upgradeGroups.length,
    completedPurchases: activeSubs,
    paidSuccessCheck: paidGroups.length,
  };
}

export interface ConversionTakeRates {
  base: number;
  weeklyFirst: number;
  semesterFirst: number;
  weeklyTakeRate: number;
  semesterTakeRate: number;
}

function toRate(numerator: number, base: number) {
  if (base <= 0) return 0;
  return Math.round((numerator / base) * 10000) / 100;
}

export async function computeConversionTakeRates(): Promise<ConversionTakeRates> {
  const [base, weeklyFirst, semesterFirst] = await Promise.all([
    prisma.user.count({
      where: { role: "USER", emailVerified: true },
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        plan: "WEEKLY",
        user: { role: "USER" },
      },
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        plan: "PRO",
        user: { role: "USER" },
      },
    }),
  ]);
  return {
    base,
    weeklyFirst,
    semesterFirst,
    weeklyTakeRate: toRate(weeklyFirst, base),
    semesterTakeRate: toRate(semesterFirst, base),
  };
}

export interface PendingToPaid {
  upgradeUsers: number;
  paidUsers: number;
  convertedUsers: number;
  rate: number;
}

export async function computePendingToPaid(
  from: Date,
  to: Date,
): Promise<PendingToPaid> {
  const [upgradeGroups, paidGroups] = await Promise.all([
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: {
        event: EVENTS.UPGRADE_START,
        createdAt: { gte: from, lte: to },
        user: { role: "USER" },
      },
    }),
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: {
        event: EVENTS.PAID_SUCCESS,
        createdAt: { gte: from, lte: to },
        user: { role: "USER" },
      },
    }),
  ]);
  const upgradeSet = new Set(upgradeGroups.map((g) => g.userId));
  const paidSet = new Set(paidGroups.map((g) => g.userId));
  let converted = 0;
  for (const id of paidSet) {
    if (upgradeSet.has(id)) converted += 1;
  }
  return {
    upgradeUsers: upgradeSet.size,
    paidUsers: paidSet.size,
    convertedUsers: converted,
    rate: upgradeSet.size > 0 ? toRate(converted, upgradeSet.size) : 0,
  };
}

export interface FallbackRate {
  total: number;
  fallback: number;
  rate: number;
  note: string | null;
}

export async function computeFallbackRate(
  from: Date,
  to: Date,
): Promise<FallbackRate> {
  const [total, fallback] = await Promise.all([
    prisma.webSearchEvent.count({
      where: { tool: "webSearch", createdAt: { gte: from, lte: to } },
    }),
    prisma.webSearchEvent.count({
      where: {
        tool: "webSearch",
        fallbackUsed: true,
        createdAt: { gte: from, lte: to },
      },
    }),
  ]);
  return {
    total,
    fallback,
    rate: total > 0 ? toRate(fallback, total) : 0,
    note: total === 0 ? FALLBACK_LOG_NOTE : null,
  };
}

export interface AiCostSummary {
  totalXaf: number;
  paidUsers: number;
  costPerPaidUserXaf: number;
  note: string | null;
}

export async function computeAiCost(
  from: Date,
  to: Date,
): Promise<AiCostSummary> {
  const [agg, paidUsers] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      _sum: { costXaf: true },
      where: { createdAt: { gte: from, lte: to } },
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        activatedAt: { gte: from, lte: to },
        user: { role: "USER" },
      },
    }),
  ]);
  const totalXaf = Math.floor(agg._sum.costXaf ?? 0);
  return {
    totalXaf,
    paidUsers,
    costPerPaidUserXaf: paidUsers > 0 ? Math.floor(totalXaf / paidUsers) : 0,
    note:
      totalXaf === 0
        ? "No AI cost rows in this window. Cost sums live from AiUsageEvent."
        : null,
  };
}
