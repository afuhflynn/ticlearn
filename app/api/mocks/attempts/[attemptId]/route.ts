import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { attemptId } = await params;
    const attempt = await prisma.mockAttempt.findUnique({
      where: { id: attemptId },
      include: {
        blueprint: {
          include: { sections: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    // Build mock sections with questions from the answers/results stored on the attempt
    // Since questions are generated at generation time, we need to reconstruct from the saved data
    const answersData = attempt.answers as Record<string, string> | null;

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        sourceMode: attempt.sourceMode,
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
      },
      blueprint: {
        name: attempt.blueprint?.name,
        durationMin: attempt.blueprint?.durationMin,
        totalMarks: attempt.blueprint?.totalMarks,
      },
      sections: attempt.blueprint?.sections.map(sec => ({
        name: sec.name,
        questionCount: sec.questionCount,
        totalMarks: sec.totalMarks,
        questionType: sec.questionType,
        answerRule: sec.answerRule,
        marksPerQuestion: sec.marksPerQuestion,
      })) ?? [],
      answers: answersData ?? {},
    });
  } catch (error) {
    console.error("Mock attempt GET error:", error);
    return NextResponse.json({ error: "Failed to load attempt" }, { status: 500 });
  }
}
