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
