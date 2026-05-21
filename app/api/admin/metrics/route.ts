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
    const granularity = searchParams.get("granularity") || "daily";
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
        prisma.user.count({ where: { role: "USER" } }),
        prisma.subscription.count({ where: { status: "ACTIVE", user: { role: "USER" } } }),
        prisma.kpiEvent.count({
          where: {
            user: { role: "USER" },
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(),
            },
          },
        }),
        prisma.kpiEvent.groupBy({
          by: ["userId"],
          where: {
            user: { role: "USER" },
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

    // Compute MAU: unique users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const mauAgg = await prisma.kpiEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: thirtyDaysAgo }, user: { role: "USER" } },
    });
    const mau = mauAgg.length;

    let metrics: Array<Record<string, unknown>>;
    let total: number;

    if (granularity === "monthly" || granularity === "yearly") {
      // Fetch all matching daily metrics, aggregate by period
      const allRows = await prisma.dailyMetric.findMany({
        where: metricFilter,
        orderBy: { date: "asc" },
      });

      const grouped = new Map<string, Map<string, number>>();
      for (const row of allRows) {
        const d = new Date(row.date);
        const key = granularity === "monthly"
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : `${d.getFullYear()}`;
        const dateKey = granularity === "monthly"
          ? `${key}-01`
          : `${key}-01-01`;
        if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
        const metricMap = grouped.get(dateKey)!;
        metricMap.set(row.metric, (metricMap.get(row.metric) ?? 0) + (row.autoValue ?? 0));
      }

      const aggregated: Array<Record<string, unknown>> = [];
      for (const [dateKey, metricMap] of grouped) {
        for (const [metric, value] of metricMap) {
          aggregated.push({ id: `${dateKey}-${metric}`, date: dateKey, metric, autoValue: value });
        }
      }

      // Sort aggregated results
      aggregated.sort((a, b) => {
        if (sort === "metric") {
          const cmp = String(a.metric).localeCompare(String(b.metric));
          return order === "asc" ? cmp : -cmp;
        }
        if (sort === "value") {
          const va = Number(a.autoValue ?? 0);
          const vb = Number(b.autoValue ?? 0);
          return order === "asc" ? va - vb : vb - va;
        }
        // sort by date
        const cmp = String(a.date).localeCompare(String(b.date));
        return order === "asc" ? cmp : -cmp;
      });

      total = aggregated.length;
      const start = (page - 1) * limit;
      metrics = aggregated.slice(start, start + limit);
    } else {
      // Daily granularity — existing behavior
      let metricsQuery = prisma.dailyMetric.findMany({
        where: metricFilter,
        orderBy: [{ date: sort === "date" ? order : "asc" }, sort !== "date" && sort !== "metric"
          ? { metric: "asc" }
          : ({} as any)],
        skip: (page - 1) * limit,
        take: limit,
      });

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

      const [fetchedMetrics, fetchedTotal] = await Promise.all([
        metricsQuery,
        prisma.dailyMetric.count({ where: metricFilter }),
      ]);
      metrics = fetchedMetrics as unknown as Array<Record<string, unknown>>;
      total = fetchedTotal;
    }

    const result: Record<string, unknown> = {
      summary: { ...summary, mau },
      metrics,
      total,
      page,
      granularity,
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
          where: { role: "USER", createdAt: { gte: thirtyDaysAgoGrowth } },
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
