import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dailyTotals } from "@/lib/ai/usage";
import { auth } from "@/lib/auth";
import { limit } from "@/lib/rate-limit";

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

function doualaStart(dateStr: string, endOfDay: boolean): Date {
  const base = new Date(`${dateStr}T00:00:00+01:00`);
  if (endOfDay) base.setDate(base.getDate() + 1);
  return base;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gated = await limit("default", req);
  if (gated) return gated;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { page, pageSize } = parsed.data;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const fromStr = parsed.data.from ?? today;
  const toStr = parsed.data.to ?? today;

  const totals = await dailyTotals(
    session.user.id,
    doualaStart(fromStr, false),
    doualaStart(toStr, true),
  );
  const totalDays = totals.length;
  const start = (page - 1) * pageSize;
  const days = totals.slice(start, start + pageSize);
  const costXaf = totals.reduce((sum, day) => sum + day.costXaf, 0);
  const calls = totals.reduce((sum, day) => sum + day.calls, 0);

  return NextResponse.json({
    days,
    page,
    pageSize,
    totalDays,
    totals: { calls, costXaf },
  });
}
