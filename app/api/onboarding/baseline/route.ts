import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_BASELINES = 200;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    const { baselines } = body as { baselines?: unknown };

    if (!Array.isArray(baselines) || baselines.length === 0) {
      return NextResponse.json({ error: "baselines array is required" }, { status: 400 });
    }

    if (baselines.length > MAX_BASELINES) {
      return NextResponse.json(
        { error: `Too many baselines. Maximum is ${MAX_BASELINES}.` },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (!user.activeProfileId) {
      return NextResponse.json({ error: "No active profile" }, { status: 400 });
    }

    // Validate each baseline
    const validated: Array<{ topicId: string; confidence: number }> = [];
    for (const item of baselines) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Each baseline must be an object" }, { status: 400 });
      }
      const b = item as Record<string, unknown>;
      if (typeof b.topicId !== "string" || !b.topicId) {
        return NextResponse.json({ error: "Each baseline must have a non-empty topicId" }, { status: 400 });
      }
      const confidence = Number(b.confidence);
      if (!Number.isFinite(confidence) || confidence < 1 || confidence > 5) {
        return NextResponse.json(
          { error: "confidence must be a number between 1 and 5" },
          { status: 400 },
        );
      }
      validated.push({ topicId: b.topicId, confidence });
    }

    await prisma.$transaction(
      validated.map(({ topicId, confidence }) =>
        prisma.userTopicBaseline.upsert({
          where: {
            examProfileId_topicId: {
              examProfileId: user.activeProfileId!,
              topicId,
            },
          },
          update: { confidence },
          create: {
            examProfileId: user.activeProfileId!,
            topicId,
            confidence,
          },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding baseline error:", error);
    return NextResponse.json({ error: "Failed to save baselines" }, { status: 500 });
  }
}
