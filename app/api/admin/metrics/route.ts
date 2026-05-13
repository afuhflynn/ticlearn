import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDailyMetrics } from "@/lib/kpi";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to + "T23:59:59.999Z"),
        },
      },
      orderBy: [{ date: "asc" }, { metric: "asc" }],
    });

    const totals = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.aggregate({ _sum: { amount: true } }),
      prisma.kpiEvent.count(),
    ]);

    return NextResponse.json({
      metrics,
      totals: {
        totalUsers: totals[0],
        activeSubscriptions: totals[1],
        totalRevenue: totals[2]._sum.amount || 0,
        totalEvents: totals[3],
      },
    });
  } catch (error) {
    console.error("Metrics GET error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { date, metric, manualValue } = await req.json();
    if (!date || !metric || manualValue === undefined) {
      return NextResponse.json({ error: "date, metric, and manualValue required" }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const entry = await prisma.dailyMetric.upsert({
      where: { date_metric: { date: startOfDay, metric } },
      update: { manualValue },
      create: { date: startOfDay, metric, manualValue },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Metrics POST error:", error);
    return NextResponse.json({ error: "Failed to update metric" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string })?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { date } = await req.json();
    const startOfDay = new Date(date || new Date());
    startOfDay.setHours(0, 0, 0, 0);

    const computed = await computeDailyMetrics(startOfDay);
    return NextResponse.json({ computed });
  } catch (error) {
    console.error("Metrics PUT error:", error);
    return NextResponse.json({ error: "Failed to compute metrics" }, { status: 500 });
  }
}
