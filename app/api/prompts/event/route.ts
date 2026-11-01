import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDoualaDayBounds } from "@/lib/day";
import { trackEvent } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";

const promptEventSchema = z.object({
  event: z.enum([
    "limit_hit",
    "prompt_shown",
    "prompt_clicked",
    "prompt_dismissed",
    "upgrade_start",
  ]),
  surface: z.enum(["quiz", "tip", "note"]).default("quiz"),
  kind: z.string().max(60).optional(),
  used: z.number().int().min(0).max(100000).optional(),
  cap: z.number().int().min(0).max(100000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ALLOWED = new Set([
  "limit_hit",
  "prompt_shown",
  "prompt_clicked",
  "prompt_dismissed",
  "upgrade_start",
]);

const HOURLY_CAP = 30;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = promptEventSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid event" },
        { status: 400 },
      );
    }

    const { event, surface, kind, used, cap, metadata } = parsed.data;
    if (!ALLOWED.has(event)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.kpiEvent.count({
      where: {
        userId: session.user.id,
        event: { in: [...ALLOWED] },
        createdAt: { gte: hourAgo },
      },
    });
    if (recent >= HOURLY_CAP) {
      return NextResponse.json(
        { error: "Too many requests", ok: false },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // First write wins per user plus event plus Douala day for the shown
    // state, so concurrent limit hits cannot print two full invites.
    if (event === "prompt_shown") {
      const { dayStart } = getDoualaDayBounds(new Date());
      const existing = await prisma.kpiEvent.findFirst({
        where: {
          userId: session.user.id,
          event: "prompt_shown",
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    await trackEvent(session.user.id, event, {
      surface,
      ...(kind ? { kind } : {}),
      ...(used !== undefined ? { used } : {}),
      ...(cap !== undefined ? { cap } : {}),
      ...(metadata ?? {}),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Prompt event POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid event" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Could not record the event" },
      { status: 500 },
    );
  }
}
