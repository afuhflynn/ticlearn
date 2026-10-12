import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ mockId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mockId } = await params;
    const { attemptId, answers, timeTaken } = await req.json();
    const profileId = await getActiveProfileId(session.user.id);

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
    });

    if (!mock) {
      return NextResponse.json(
        { error: "Mock exam not found" },
        { status: 404 },
      );
    }

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const ownsAttempt = profileId
      ? attempt.examProfileId === profileId
      : attempt.userId === session.user.id;
    if (!ownsAttempt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.paper3MockAttempt.update({
      where: { id: attemptId },
      data: {
        processingStatus: "PROCESSING",
      },
    });

    await inngest.send({
      name: "paper3/evaluate-exam",
      data: {
        attemptId,
        mockId,
        userId: session.user.id,
        examProfileId: profileId,
        answers,
        timeTaken,
      },
    });

    return NextResponse.json({
      success: true,
      attemptId,
      processingStatus: "PROCESSING",
      message: "Exam submitted. Results are being processed.",
    });
  } catch (error) {
    console.error("Paper3 mock submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit exam" },
      { status: 500 },
    );
  }
}
