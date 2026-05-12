import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { baselines } = body;

    if (!Array.isArray(baselines) || baselines.length === 0) {
      return NextResponse.json({ error: "baselines array is required" }, { status: 400 });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    });

    if (!user.activeProfileId) {
      return NextResponse.json({ error: "No active profile" }, { status: 400 });
    }

    await prisma.$transaction(
      baselines.map((b: { topicId: string; confidence: number }) =>
        prisma.userTopicBaseline.upsert({
          where: {
            examProfileId_topicId: {
              examProfileId: user.activeProfileId!,
              topicId: b.topicId,
            },
          },
          update: { confidence: b.confidence },
          create: {
            examProfileId: user.activeProfileId!,
            topicId: b.topicId,
            confidence: b.confidence,
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
