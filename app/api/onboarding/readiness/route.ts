import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/readiness";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (!user.activeProfileId) {
      return NextResponse.json({
        readiness: 50,
        weakestTopic: null,
        weakestProgram: null,
        needsAssessment: true,
        highRisk: false,
        daysUntilExam: null,
        programReadiness: [],
      });
    }

    const full = await computeReadiness(user.activeProfileId);

    return NextResponse.json({
      readiness: full.readiness,
      weakestTopic: full.weakestTopic?.name ?? null,
      weakestTopicScore: full.weakestTopic?.score ?? null,
      weakestProgram: full.weakestProgram,
      strongestTopic: full.strongestTopic?.name ?? null,
      strongestTopicScore: full.strongestTopic?.score ?? null,
      programReadiness: full.programReadiness,
      highRisk: full.highRisk,
      daysUntilExam: full.daysUntilExam,
      needsAssessment: full.needsAssessment,
    });
  } catch (error) {
    console.error("Readiness error:", error);
    return NextResponse.json({ error: "Failed to compute readiness" }, { status: 500 });
  }
}
