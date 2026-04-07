import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

    const { type, subject, message, isFlagged } = await req.json();

    if (!type || !subject || !message) {
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
        subject,
        message,
        isFlagged: isFlagged || false,
        isUrgent: false,
        status: "OPEN",
      },
    });

    return NextResponse.json({ feedback, success: true });
  } catch (error) {
    console.error("Feedback POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
