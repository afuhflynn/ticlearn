import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const to = searchParams.get("to") || new Date().toISOString().split("T")[0];
    const metricsFilter = searchParams.get("metrics") || "";

    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59.999Z");

    const where: Record<string, unknown> = {
      date: { gte: fromDate, lte: toDate },
    };
    if (metricsFilter) {
      where.metric = { in: metricsFilter.split(",") };
    }

    const metrics = await prisma.dailyMetric.findMany({
      where,
      orderBy: [{ date: "asc" }, { metric: "asc" }],
    });

    const headers_row = ["date", "metric", "value"];
    const rows = metrics.map((m) => [
      m.date.toISOString().split("T")[0],
      m.metric,
      String(m.autoValue ?? ""),
    ]);

    const csv = [headers_row.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="metrics-${from}-to-${to}.csv"`,
      },
    });
  } catch (error) {
    console.error("Metrics export error:", error);
    return NextResponse.json(
      { error: "Failed to export metrics" },
      { status: 500 },
    );
  }
}
