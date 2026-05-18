import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { computeReadiness } from "@/lib/readiness";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ readiness: 50, needsAssessment: true });

    const readiness = await computeReadiness(profileId);

    // Build recommendations
    const recommendations: string[] = [];

    if (readiness.weakestTopic && readiness.weakestTopic.score < 40) {
      recommendations.push(
        `Practice ${readiness.weakestTopic.name} - currently at ${readiness.weakestTopic.score}%`,
      );
    }

    if (readiness.readiness < 50) {
      recommendations.push(
        "Take a full mock exam this week to assess your level",
      );
    }

    const recentlyPracticed = await import("@/lib/prisma")
      .then((m) =>
        m.prisma.topicPerformance.count({
          where: {
            examProfileId: profileId,
            lastPracticedAt: {
              gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      )
      .catch(() => 0);

    if (recentlyPracticed === 0 && readiness.weakestTopic) {
      recommendations.push(
        `You haven't practiced ${readiness.weakestTopic.name} recently`,
      );
    }

    if (readiness.highRisk) {
      recommendations.unshift(
        "⚠️ High Risk Zone - focused practice recommended daily",
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
