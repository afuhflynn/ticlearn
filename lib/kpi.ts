import { prisma } from "./prisma";

export async function trackEvent(userId: string, event: string, metadata?: Record<string, unknown>) {
  await prisma.kpiEvent.create({
    data: {
      userId,
      event,
      metadata: metadata ?? {},
    },
  });
}

export async function computeDailyMetrics(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const [activeUsers, feedbacks, paidUsers, totalUsers] = await Promise.all([
    prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.feedback.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.subscription.count({
      where: { status: "ACTIVE" },
    }),
    prisma.user.count(),
  ]);

  const metrics: Array<{ metric: string; value: number }> = [
    { metric: "active_users", value: activeUsers.length },
    { metric: "feedbacks", value: feedbacks },
    { metric: "paid_users", value: paidUsers },
    { metric: "conversion_rate", value: totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0 },
  ];

  for (const m of metrics) {
    await prisma.dailyMetric.upsert({
      where: { date_metric: { date: startOfDay, metric: m.metric } },
      update: { autoValue: m.value },
      create: { date: startOfDay, metric: m.metric, autoValue: m.value },
    });
  }

  return metrics;
}
