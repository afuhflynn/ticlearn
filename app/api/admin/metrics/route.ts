import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeDailyMetrics,
  computeCohortRetention,
  computeMasteryMetrics,
  computeSubjectDistribution,
  computeMRR,
  computeActivationFunnel,
} from "@/lib/kpi";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from =
      searchParams.get("from") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const to =
      searchParams.get("to") || new Date().toISOString().split("T")[0];
    const tab = searchParams.get("tab") || "overview";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";

    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59.999Z");

    // Summary cards - always returned
    const [totalUsers, activeSubsAgg, todayEvents, dausAgg, mrrData] =
      await Promise.all([
        prisma.user.count(),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.kpiEvent.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(),
            },
          },
        }),
        prisma.kpiEvent.groupBy({
          by: ["userId"],
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(),
            },
          },
        }),
        computeMRR(),
      ]);

    const paidUsers = activeSubsAgg;
    const daus = dausAgg.length;
    const conversionRate =
      totalUsers > 0
        ? Math.round((paidUsers / totalUsers) * 10000) / 100
        : 0;

    const summary = {
      totalUsers,
      paidUsers,
      daus,
      conversionRate,
      mrr: mrrData.mrr,
      totalSubscribers: mrrData.totalSubscribers,
      todayEvents,
    };

    // Build metric filter
    const metricFilter: { date?: { gte: Date; lte: Date }; metric?: { contains: string } } = {
      date: { gte: fromDate, lte: toDate },
    };
    if (search) {
      metricFilter.metric = { contains: search };
    }

    // Get daily metrics
    let metricsQuery = prisma.dailyMetric.findMany({
      where: metricFilter,
      orderBy: [{ date: sort === "date" ? order : "asc" }, sort !== "date" && sort !== "metric"
        ? { metric: "asc" }
        : ({} as any)],
      skip: (page - 1) * limit,
      take: limit,
    });

    // If sort is on a metric value, we need to handle differently
    if (sort === "value") {
      metricsQuery = prisma.dailyMetric.findMany({
        where: metricFilter,
        orderBy: [{ autoValue: order === "asc" ? "asc" : "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      });
    } else if (sort === "metric") {
      metricsQuery = prisma.dailyMetric.findMany({
        where: metricFilter,
        orderBy: [{ metric: order === "asc" ? "asc" : "desc" }, { date: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    const [metrics, total] = await Promise.all([
      metricsQuery,
      prisma.dailyMetric.count({ where: metricFilter }),
    ]);

    // Compute MAU: unique users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const mauAgg = await prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    const mau = mauAgg.length;

    const result: Record<string, unknown> = {
      summary: { ...summary, mau },
      metrics,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // Tab-specific data
    switch (tab) {
      case "engagement": {
        const today = new Date();
        const subjectDist = await computeSubjectDistribution(today);
        result.subjectDistribution = subjectDist;
        break;
      }
      case "learning": {
        const mastery = await computeMasteryMetrics();
        result.mastery = mastery;
        break;
      }
      case "growth": {
        const thirtyDaysAgoGrowth = new Date();
        thirtyDaysAgoGrowth.setDate(thirtyDaysAgoGrowth.getDate() - 30);
        const newUsers = await prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgoGrowth } },
        });
        const activationFunnel = await computeActivationFunnel();
        result.newUsersLast30Days = newUsers;
        result.activationFunnel = activationFunnel;
        break;
      }
      case "monetization": {
        result.mrrByPlan = mrrData.byPlan;
        result.conversionRate = conversionRate;
        break;
      }
      case "retention": {
        const retention = await computeCohortRetention();
        result.retention = retention;
        break;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Metrics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { date } = await req.json();
    const startOfDay = new Date(date || new Date());
    startOfDay.setHours(0, 0, 0, 0);

    const computed = await computeDailyMetrics(startOfDay);
    return NextResponse.json({ computed });
  } catch (error) {
    console.error("Metrics PUT error:", error);
    return NextResponse.json(
      { error: "Failed to compute metrics" },
      { status: 500 },
    );
  }
}
