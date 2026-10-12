import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Throttle: already processing
    if (note.status === "PROCESSING") {
      return NextResponse.json(
        { error: "Note is already being processed." },
        { status: 409 },
      );
    }

    // Throttle: cooldown (30s since last update)
    const cooldownMs = 30_000;
    if (note.updatedAt && Date.now() - note.updatedAt.getTime() < cooldownMs) {
      return NextResponse.json(
        {
          error:
            "Note was recently processed. Please wait 30 seconds before trying again.",
        },
        { status: 429 },
      );
    }

    // Throttle: daily cap (10 processing events per user per day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const processCountToday = await prisma.note.count({
      where: {
        userId: session.user.id,
        updatedAt: { gte: todayStart },
        status: "PROCESSING",
      },
    });
    if (processCountToday >= 10) {
      return NextResponse.json(
        {
          error:
            "Daily processing limit reached (10/day). Please try again tomorrow.",
        },
        { status: 429 },
      );
    }

    await prisma.note.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    await inngest.send({
      name: "note/process",
      data: { noteId: id },
    });

    return NextResponse.json({ success: true, message: "Processing started" });
  } catch (error) {
    console.error("Note process error:", error);
    return NextResponse.json(
      { error: "Failed to process note" },
      { status: 500 },
    );
  }
}
