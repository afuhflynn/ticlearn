import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { invalidateRead } from "@/lib/cache/reads";
import { prisma } from "@/lib/prisma";

const recordSchema = z.object({
  noteId: z.string().min(1),
  topicId: z.string().min(1),
  result: z.enum(["CORRECT", "NEEDED_HELP"]),
  weight: z.enum(["quiz", "mock"]).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    const { noteId, topicId, result, weight } = recordSchema.parse(
      await req.json(),
    );

    const topicNote = await prisma.topicNote.findUnique({
      where: { topicId_noteId: { topicId, noteId } },
      select: { note: { select: { userId: true } } },
    });

    if (!topicNote || topicNote.note.userId !== userId) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const questionWeight = weight === "mock" ? 2 : 1;

    const performance = await prisma.topicPerformance.upsert({
      where: { noteId_topicId: { noteId, topicId } },
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
        noteId,
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

    // This student's readiness inputs just changed, so their entry goes and
    // nobody else's does.
    await invalidateRead("read:readiness", { kind: "user", userId });

    return NextResponse.json({
      masteryScore: clamped,
      totalAttempts: performance.totalAttempts,
      correctAttempts: performance.correctAttempts,
    });
  } catch (error) {
    console.error("Performance POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid performance payload" },
        { status: 400 },
      );
    }
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

    const rows = await prisma.topicPerformance.findMany({
      where: { note: { userId: session.user.id } },
      select: {
        noteId: true,
        masteryScore: true,
        topic: { select: { name: true } },
      },
      orderBy: { masteryScore: "asc" },
    });

    const byTopic = new Map<string, { score: number[]; notes: Set<string> }>();
    for (const row of rows) {
      const bucket = byTopic.get(row.topic.name) ?? {
        score: [],
        notes: new Set<string>(),
      };
      bucket.score.push(row.masteryScore);
      bucket.notes.add(row.noteId);
      byTopic.set(row.topic.name, bucket);
    }

    const performances = [...byTopic.entries()]
      .map(([topic, bucket]) => ({
        topic,
        score: Math.round(
          bucket.score.reduce((sum, s) => sum + s, 0) / bucket.score.length,
        ),
        notes: bucket.notes.size,
      }))
      .sort((a, b) => a.score - b.score);

    return NextResponse.json({ performances });
  } catch (error) {
    console.error("Performance GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch performances" },
      { status: 500 },
    );
  }
}
