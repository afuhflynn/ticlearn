import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ readiness: 50, weakestTopic: null, needsAssessment: true });
    }

    const baselines = await prisma.userTopicBaseline.findMany({
      where: { examProfileId: user.activeProfileId },
      include: { topic: { select: { name: true } } },
    });

    if (baselines.length === 0) {
      return NextResponse.json({ readiness: 50, weakestTopic: null, needsAssessment: true });
    }

    const avg = baselines.reduce((s, b) => s + Math.min(Math.max(b.confidence, 0), 5), 0) / baselines.length;
    const readiness = Math.min(100, Math.max(0, Math.round((avg / 5) * 100)));

    const weakest = baselines.reduce((min, b) => (b.confidence < min.confidence ? b : min));
    const weakestTopic = weakest.topic.name;

    return NextResponse.json({ readiness, weakestTopic, needsAssessment: false });
  } catch (error) {
    console.error("Readiness error:", error);
    return NextResponse.json({ error: "Failed to compute readiness" }, { status: 500 });
  }
}
