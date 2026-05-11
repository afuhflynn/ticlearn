import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, rating, attemptId, mockId } = await req.json();

    if (!message && !rating) {
      return NextResponse.json(
        { error: "Either message or rating is required" },
        { status: 400 },
      );
    }

    if (message && message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 },
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name || "User",
        type: "EXAM",
        subject: `Exam Feedback${mockId ? ` - ${mockId}` : ""}`,
        message: message || "No message",
        rating: rating || 0,
        attemptId: attemptId || null,
        mockId: mockId || null,
        isFlagged: false,
        isUrgent: false,
        status: "OPEN",
      },
    });

    return NextResponse.json({ feedback, success: true });
  } catch (error) {
    console.error("Exam feedback POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit exam feedback" },
      { status: 500 },
    );
  }
}
