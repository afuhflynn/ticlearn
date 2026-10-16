import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notifyAdminsOfFeedback } from "@/lib/email/send";
import { EVENTS, trackEvent } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Feedbacks GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedbacks" },
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

    const { type, subject, message, isFlagged, conversationId, rating } =
      await req.json();

    if (!type || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name || "User",
        type,
        subject: subject || `${type} Feedback`,
        message,
        isFlagged: isFlagged || false,
        isUrgent: false,
        status: "OPEN",
        conversationId: conversationId || null,
        rating: rating ?? 0,
      },
    });

    trackEvent(session.user.id, EVENTS.FEEDBACK_SUBMITTED, {
      type,
      subject,
    }).catch(() => {});

    notifyAdminsOfFeedback({
      userName: session.user.name || "User",
      userEmail: session.user.email,
      type,
      subject: subject || `${type} Feedback`,
      message,
      rating: rating ?? null,
    }).catch(() => {});

    return NextResponse.json({ feedback, success: true });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
