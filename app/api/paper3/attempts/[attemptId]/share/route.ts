import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    const profileId = await getActiveProfileId(session.user.id);

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId },
      select: {
        userId: true,
        examProfileId: true,
        shareId: true,
        score: true,
        mock: { select: { title: true } },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const ownsAttempt = profileId
      ? attempt.examProfileId === profileId
      : attempt.userId === session.user.id;
    if (!ownsAttempt) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }

    let shareId = attempt.shareId;
    if (!shareId) {
      shareId = nanoid(12);
      await prisma.paper3MockAttempt.update({
        where: { id: attemptId },
        data: { shareId, sharedAt: new Date() },
      });
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/result/${shareId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      score: attempt.score,
      mockTitle: attempt.mock.title,
    });
  } catch (error) {
    console.error("Share result error:", error);
    return NextResponse.json({ error: "Failed to share" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not your attempt" }, { status: 403 });
    }

    await prisma.paper3MockAttempt.update({
      where: { id: attemptId },
      data: { shareId: null, sharedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unshare result error:", error);
    return NextResponse.json({ error: "Failed to unshare" }, { status: 500 });
  }
}