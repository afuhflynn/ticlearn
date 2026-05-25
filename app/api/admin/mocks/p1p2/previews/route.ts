import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MockSessionPayload } from "@/lib/mock-generator";
import { parseStoredSessionPayload } from "@/lib/mock-session-payload";

function summaryTitle(
  payload: MockSessionPayload | null,
  blueprintName: string | null | undefined,
) {
  if (payload?.displayName) return payload.displayName;
  if (blueprintName) return blueprintName;
  return "Practice mock";
}

/** Admin preview sessions (Paper 1 & 2 bespoke mocks) — not shown on the student Recent list. */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profiles = await prisma.examProfile.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileIds = profiles.map((p) => p.id);
    if (profileIds.length === 0) {
      return NextResponse.json({ attempts: [] });
    }

    const rows = await prisma.mockAttempt.findMany({
      where: {
        creationContext: "ADMIN_PREVIEW",
        examProfileId: { in: profileIds },
      },
      orderBy: { startedAt: "desc" },
      take: 40,
      include: {
        blueprint: { select: { name: true, durationMin: true } },
      },
    });

    const attempts = rows.map((row) => {
      const payload = parseStoredSessionPayload(row.sessionPayload);
      return {
        id: row.id,
        title: summaryTitle(payload, row.blueprint?.name),
        totalMarks: row.totalMarks,
        score: row.score,
        completedAt: row.completedAt,
        startedAt: row.startedAt,
        durationMin:
          typeof payload?.durationMin === "number"
            ? payload.durationMin
            : row.blueprint?.durationMin ?? null,
        inProgress: row.completedAt == null && row.score == null,
      };
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Admin P1P2 previews GET error:", error);
    return NextResponse.json(
      { error: "Could not load admin previews" },
      { status: 500 },
    );
  }
}
