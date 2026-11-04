import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MAX_SNAPSHOT_BYTES } from "@/lib/chat/quiz-snapshot";
import { prisma } from "@/lib/prisma";

const BACKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const postBody = z.object({
  conversationId: z.string().min(1).max(100),
  clientRunId: z.string().min(1).max(200),
  snapshot: z.unknown(),
});

/**
 * Light server mirror of the browser quiz snapshot so a new device can
 * resume the same run. Last write wins per run id. Writes are paced on the
 * client to at most one per 2 seconds. Offline writes skip quietly and the
 * browser copy stays the source of truth.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const parsed = postBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { conversationId, clientRunId, snapshot } = parsed.data;

    if (snapshot === null || snapshot === undefined) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const raw =
      typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot);
    if (raw.length > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json(
        { error: "Snapshot too large" },
        { status: 400 },
      );
    }

    const owned = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const existing = await prisma.chatRunBackup.findUnique({
      where: { clientRunId },
      select: { userId: true, conversationId: true },
    });
    if (
      existing &&
      (existing.userId !== userId || existing.conversationId !== conversationId)
    ) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const row = await prisma.chatRunBackup.upsert({
      where: { clientRunId },
      update: { snapshot: raw },
      create: { userId, conversationId, clientRunId, snapshot: raw },
      select: { updatedAt: true },
    });

    // Best effort expiry sweep for this student's own rows. One indexed
    // delete per write, no new background job for a mirror this small.
    await prisma.chatRunBackup
      .deleteMany({
        where: {
          userId,
          updatedAt: { lt: new Date(Date.now() - BACKUP_TTL_MS) },
        },
      })
      .catch(() => null);

    return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
  } catch (error) {
    console.error("[CHAT] Run backup write error:", error);
    return NextResponse.json({ error: "Failed to save backup" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const search = new URL(req.url).searchParams;
    const conversationId = search.get("conversationId") ?? "";
    const clientRunId = search.get("clientRunId") ?? "";
    if (!conversationId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const owned = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (clientRunId) {
      const row = await prisma.chatRunBackup.findFirst({
        where: { clientRunId, userId, conversationId },
        select: { snapshot: true, updatedAt: true },
      });
      if (!row) return NextResponse.json({ snapshot: null });
      if (Date.now() - row.updatedAt.getTime() > BACKUP_TTL_MS) {
        await prisma.chatRunBackup
          .deleteMany({ where: { clientRunId, userId } })
          .catch(() => null);
        return NextResponse.json({ snapshot: null });
      }
      return NextResponse.json({ snapshot: row.snapshot });
    }

    const latest = await prisma.chatRunBackup.findFirst({
      where: {
        userId,
        conversationId,
        updatedAt: { gt: new Date(Date.now() - BACKUP_TTL_MS) },
      },
      orderBy: { updatedAt: "desc" },
      select: { snapshot: true, clientRunId: true },
    });
    if (!latest) return NextResponse.json({ snapshot: null });
    return NextResponse.json({
      snapshot: latest.snapshot,
      clientRunId: latest.clientRunId,
    });
  } catch (error) {
    console.error("[CHAT] Run backup read error:", error);
    return NextResponse.json({ error: "Failed to read backup" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const search = new URL(req.url).searchParams;
    const conversationId = search.get("conversationId") ?? "";
    const clientRunId = search.get("clientRunId") ?? "";
    if (!conversationId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await prisma.chatRunBackup.deleteMany({
      where: {
        userId,
        conversationId,
        ...(clientRunId ? { clientRunId } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CHAT] Run backup clear error:", error);
    return NextResponse.json({ error: "Failed to clear backup" }, { status: 500 });
  }
}
