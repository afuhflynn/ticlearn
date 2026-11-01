import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CONVERSION_EVENTS = [
  "limit_hit",
  "prompt_shown",
  "prompt_clicked",
  "prompt_dismissed",
  "upgrade_start",
] as const;

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const rows = await prisma.kpiEvent.groupBy({
      by: ["event"],
      where: {
        event: { in: [...CONVERSION_EVENTS] },
        createdAt: { gte: start, lte: end },
        user: { role: "USER" },
      },
      _count: true,
    });

    const byEvent: Record<string, number> = {};
    for (const e of CONVERSION_EVENTS) byEvent[e] = 0;
    for (const r of rows) byEvent[r.event] = r._count;

    const paid = await prisma.subscription.count({
      where: { status: "ACTIVE", user: { role: "USER" } },
    });

    return NextResponse.json({
      range: { start: start.toISOString(), end: end.toISOString() },
      byEvent,
      paid,
    });
  } catch (error) {
    console.error("Admin conversion GET error:", error);
    return NextResponse.json(
      { error: "Could not read conversion" },
      { status: 500 },
    );
  }
}
