import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const quiz = await prisma.quiz.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, status: true, questionCount: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: quiz.id,
      status: quiz.status,
      questionCount: quiz.questionCount,
    });
  } catch (error) {
    console.error("Quiz status GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz status" },
      { status: 500 },
    );
  }
}
