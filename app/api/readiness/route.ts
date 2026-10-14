import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/readiness";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const readiness = await computeReadiness(userId);

    const recommendations: string[] = [];

    if (readiness.weakestTopic && readiness.weakestTopic.score < 40) {
      recommendations.push(
        `Practice ${readiness.weakestTopic.name} - currently at ${readiness.weakestTopic.score}%`,
      );
    }

    if (readiness.needsAssessment) {
      recommendations.push(
        "Upload a note and generate a quiz from it to see your readiness",
      );
    }

    const recentlyPractised = await prisma.topicPerformance.count({
      where: {
        note: { userId },
        lastPracticedAt: {
          gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentlyPractised === 0 && readiness.weakestTopic) {
      recommendations.push(
        `You haven't practised ${readiness.weakestTopic.name} recently`,
      );
    }

    return NextResponse.json({ ...readiness, recommendations });
  } catch (error) {
    console.error("Readiness GET error:", error);
    return NextResponse.json(
      { error: "Failed to compute readiness" },
      { status: 500 },
    );
  }
}
