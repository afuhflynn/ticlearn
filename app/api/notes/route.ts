import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDashboardNotes } from "@/lib/dashboard-data";
import { inngest } from "@/lib/inngest/client";
import { trackEvent } from "@/lib/kpi";
import { getPlanLimits, limitReached, resolvePlan } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { utapi } from "@/lib/uploadthing-server";

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  uploadthingKey: z.string().min(1, "UploadThing key is required"),
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

    const payload = await getDashboardNotes(session.user.id);

    return NextResponse.json(payload);
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

    const plan = resolvePlan(subscription);
    const uploadLimit = getPlanLimits(plan).pdfUploads;

    // Count current notes
    const noteCount = await prisma.note.count({
      where: { userId: session.user.id },
    });

    // Check if user has reached their limit
    if (limitReached(uploadLimit, noteCount)) {
      return NextResponse.json(
        {
          error: `Upload limit reached (${uploadLimit} notes). Please upgrade to continue.`,
        },
        { status: 403 },
      );
    }

    const { title, uploadthingKey, fileName, fileType } =
      createNoteSchema.parse(await req.json());

    // Derive fileUrl server-side from uploadthingKey, ignore any client-provided URL
    const fileUrls = await utapi.getFileUrls(uploadthingKey);
    if (!fileUrls || !fileUrls.data || fileUrls.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid upload key" },
        { status: 400 },
      );
    }
    const fileUrl = fileUrls.data[0].url;

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title,
        fileUrl,
        uploadthingKey,
        fileName,
        fileType,
        keyPoints: [],
        status: "UPLOADING",
      },
    });

    try {
      await inngest.send({
        name: "note/process",
        data: { noteId: note.id },
      });

      // Kick off the visual course page analysis pipeline (spec 0027).
      await inngest.send({
        name: "note/uploaded",
        data: { noteId: note.id },
      });

      const queuedNote = await prisma.note.update({
        where: { id: note.id },
        data: { status: "PROCESSING" },
      });

      trackEvent(session.user.id, "note_uploaded", {
        noteId: note.id,
        title: note.title,
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
