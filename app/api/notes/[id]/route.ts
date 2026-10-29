import { del } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { deleteFile, getUploadThingFileKey } from "@/lib/file";
import { prisma } from "@/lib/prisma";
import { pruneOrphanTopics } from "@/lib/topics";

const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
});

export async function GET(
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
      include: {
        quizzes: {
          orderBy: { createdAt: "desc" },
        },
        user: {
          select: { id: true, name: true, image: true },
        },
        topicNotes: {
          include: { topic: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({
      note: {
        ...note,
        topics: note.topicNotes.map((link) => link.topic.name),
        latestQuiz: note.quizzes[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Note GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
      include: { topicNotes: { select: { topicId: true } } },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const uploadthingKey =
      note.uploadthingKey || getUploadThingFileKey(note.fileUrl);

    if (uploadthingKey) {
      try {
        await deleteFile(uploadthingKey);
      } catch (fileDeleteError) {
        console.error("UploadThing delete error:", fileDeleteError);
        return NextResponse.json(
          { error: "Failed to delete the uploaded file" },
          { status: 502 },
        );
      }
    }

    // Page images rendered for visual analysis live in Blob, outside the
    // Prisma cascade, so delete them before the note row goes.
    const pages = await prisma.page.findMany({
      where: { noteId: id },
      select: { pageImageUrl: true },
    });
    const pageImageUrls = pages
      .map((page) => page.pageImageUrl)
      .filter((url): url is string => Boolean(url));
    if (pageImageUrls.length > 0) {
      try {
        await del(pageImageUrls);
      } catch (blobDeleteError) {
        console.error("Blob page image delete error:", blobDeleteError);
        return NextResponse.json(
          { error: "Failed to delete the note page images" },
          { status: 502 },
        );
      }
    }

    await prisma.note.delete({
      where: { id: note.id },
    });

    await pruneOrphanTopics(note.topicNotes.map((link) => link.topicId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
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
    const data = updateNoteSchema.parse(await req.json());

    if (!data.title) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const note = await prisma.note.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data,
      include: {
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
      note: {
        ...updatedNote,
        latestQuiz: updatedNote.quizzes[0] ?? null,
      },
      success: true,
    });
  } catch (error) {
    console.error("Note PUT error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid note data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}
