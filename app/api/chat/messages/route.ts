import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, role, content, parts } = await req.json();

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        userId: session.user.id,
        role,
        content,
        parts: (parts ?? []) as never,
      },
    });

    await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[CHAT] Add message error:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 },
    );
  }
}
