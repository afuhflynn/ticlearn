import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeStoredParts } from "@/lib/chat-messages";
import { deleteFile, getUploadThingFileKey, utapi } from "@/lib/file";
import { prisma } from "@/lib/prisma";

const MESSAGES_PER_PAGE = 30;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || MESSAGES_PER_PAGE,
      100,
    );

    const conversation = await prisma.chatConversation.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, title: true, createdAt: true, updatedAt: true, summary: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        role: true,
        content: true,
        parts: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? pageMessages[pageMessages.length - 1]?.id : null;

    return NextResponse.json({
      conversation,
      messages: pageMessages
        .reverse()
        .map((message) => ({
          ...message,
          parts: normalizeStoredParts(message.parts, message.content),
        })),
      nextCursor,
    });
  } catch (error) {
    console.error("[CHAT] Get conversation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await req.json();

    const conversation = await prisma.chatConversation.updateMany({
      where: { id, userId: session.user.id },
      data: { title },
    });

    if (conversation.count === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAT] Update conversation error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      select: { parts: true },
    });

    const fileKeys: string[] = [];
    for (const msg of messages) {
      const parts = msg.parts as Array<Record<string, unknown>>;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (
          part?.type === "file" &&
          typeof part?.url === "string" &&
          part.url.startsWith("https://utfs.io/")
        ) {
          const key = getUploadThingFileKey(part.url);
          if (key) fileKeys.push(key);
        }
      }
    }

    if (fileKeys.length > 0) {
      try {
        await utapi.deleteFiles(fileKeys);
      } catch (e) {
        console.error("[CHAT] Failed to delete UploadThing files:", e);
      }
    }

    const conversation = await prisma.chatConversation.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (conversation.count === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAT] Delete conversation error:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 },
    );
  }
}
