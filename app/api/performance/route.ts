import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { topicId, result, weight } = await req.json();
    if (!topicId || !result)
      return NextResponse.json(
        { error: "topicId and result required" },
        { status: 400 },
      );
    if (result !== "CORRECT" && result !== "NEEDED_HELP")
      return NextResponse.json(
        { error: "result must be CORRECT or NEEDED_HELP" },
        { status: 400 },
      );

    const questionWeight = weight === "mock" ? 2 : 1;
    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const performance = await prisma.topicPerformance.upsert({
      where: { examProfileId_topicId: { examProfileId: profileId, topicId } },
      update: {
        totalAttempts: { increment: questionWeight },
        correctAttempts:
          result === "CORRECT" ? { increment: questionWeight } : undefined,
        masteryScore:
          result === "CORRECT"
            ? { increment: 5 * questionWeight }
            : { decrement: 5 * questionWeight },
        lastPracticedAt: new Date(),
      },
      create: {
        examProfileId: profileId,
        topicId,
        totalAttempts: questionWeight,
        correctAttempts: result === "CORRECT" ? questionWeight : 0,
        masteryScore:
          result === "CORRECT"
            ? 50 + 5 * questionWeight
            : 50 - 5 * questionWeight,
        lastPracticedAt: new Date(),
      },
    });

    const clamped = Math.min(100, Math.max(0, performance.masteryScore));
    if (clamped !== performance.masteryScore) {
      await prisma.topicPerformance.update({
        where: { id: performance.id },
        data: { masteryScore: clamped },
      });
    }

    return NextResponse.json({
      masteryScore: clamped,
      totalAttempts: performance.totalAttempts,
      correctAttempts: performance.correctAttempts,
    });
  } catch (error) {
    console.error("Performance POST error:", error);
    return NextResponse.json(
      { error: "Failed to record performance" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const performances = await prisma.topicPerformance.findMany({
      where: { examProfileId: profileId },
      include: {
        topic: {
          select: { name: true, component: { select: { name: true } } },
        },
      },
      orderBy: { masteryScore: "asc" },
    });

    return NextResponse.json({ performances });
  } catch (error) {
    console.error("Performance GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch performances" },
      { status: 500 },
    );
  }
}
