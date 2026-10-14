import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.chatConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[CHAT] Get conversations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      noteId?: string;
    };
    const title = body.title || "New Chat";

    let noteId: string | null = null;
    if (body.noteId) {
      const note = await prisma.note.findFirst({
        where: { id: body.noteId, userId: session.user.id },
        select: { id: true },
      });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      noteId = note.id;
    }

    const conversation = await prisma.chatConversation.create({
      data: {
        userId: session.user.id,
        title,
        noteId,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("[CHAT] Create conversation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
