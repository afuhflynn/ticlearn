import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/kpi";

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  fileUrl: z.string().url("A valid file URL is required"),
  uploadthingKey: z.string().min(1).optional(),
  fileName: z.string().min(1, "File name is required"),
  fileType: z.enum(["PDF", "IMAGE", "WORD"]),
});

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { quizzes: true },
        },
        quizzes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        ...note,
        quizCount: note._count.quizzes,
        latestQuiz: note.quizzes[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check upload limits
    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const plan = subscription?.status === "ACTIVE" ? subscription.plan : "FREE";

    // Define limits per plan
    const limits: Record<string, number> = {
      FREE: 2,
      STARTER: 10,
      STANDARD: 30,
      PREMIUM: -1,
    };

    const uploadLimit = limits[plan] || 2;

    // Count current notes
    const noteCount = await prisma.note.count({
      where: { userId: session.user.id },
    });

    // Check if user has reached their limit
    if (uploadLimit !== -1 && noteCount >= uploadLimit) {
      return NextResponse.json(
        {
          error: `Upload limit reached (${uploadLimit} notes). Please upgrade to continue.`,
        },
        { status: 403 },
      );
    }

    const { title, subject, fileUrl, uploadthingKey, fileName, fileType } =
      createNoteSchema.parse(await req.json());

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title,
        subject,
        fileUrl,
        uploadthingKey,
        fileName,
        fileType,
        topics: [],
        keyPoints: [],
        status: "UPLOADING",
      },
    });

    try {
      await inngest.send({
        name: "note/process",
        data: { noteId: note.id },
      });

      const queuedNote = await prisma.note.update({
        where: { id: note.id },
        data: { status: "PROCESSING" },
      });

      trackEvent(session.user.id, "note_uploaded", {
        noteId: note.id,
        title: note.title,
        subject: note.subject,
        fileType: note.fileType,
      }).catch(() => {});

      return NextResponse.json({ note: queuedNote });
    } catch (processError) {
      console.error("Failed to trigger note processing:", processError);
      await prisma.note.update({
        where: { id: note.id },
        data: { status: "ERROR" },
      });
      return NextResponse.json(
        { error: "Note uploaded, but processing could not be started" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Notes POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid note data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
