import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await req.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: session.user.id },
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
        { error: "Note was recently processed. Please wait 30 seconds before trying again." },
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
        { error: "Daily processing limit reached (10/day). Please try again tomorrow." },
        { status: 429 },
      );
    }

    await prisma.note.update({
      where: { id: noteId },
      data: { status: "PROCESSING" },
    });

    try {
      await inngest.send({
        name: "note/process",
        data: { noteId },
      });
    } catch (inngestError) {
      console.error("Inngest send error:", inngestError);
    }

    return NextResponse.json({
      success: true,
      message: "Note processing started",
      note: { ...note, status: "PROCESSING", keyPoints: note.keyPoints ?? [] },
    });
  } catch (error) {
    console.error("Note process error:", error);
    return NextResponse.json(
      { error: "Failed to process note" },
      { status: 500 },
    );
  }
}
