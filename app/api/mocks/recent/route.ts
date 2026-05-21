import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MockSessionPayload } from "@/lib/mock-generator";
import { getActiveProfileId } from "@/lib/exam-profile";
import { parseStoredSessionPayload } from "@/lib/mock-session-payload";

function summaryTitle(
  payload: MockSessionPayload | null,
  blueprintName: string | null | undefined,
) {
  if (payload?.displayName) return payload.displayName;
  if (blueprintName) return blueprintName;
  return "Practice mock";
}

/** Recent GCE mock attempts for the student's active profile. */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const rows = await prisma.mockAttempt.findMany({
      where: { examProfileId: profileId },
      orderBy: { startedAt: "desc" },
      take: 30,
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
    console.error("Recent mocks GET error:", error);
    return NextResponse.json(
      { error: "Could not load recent mocks" },
      { status: 500 },
    );
  }
}
