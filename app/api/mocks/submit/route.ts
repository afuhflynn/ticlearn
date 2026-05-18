import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { attemptId, answers, timeTaken } = await req.json();
    if (!attemptId || !answers)
      return NextResponse.json(
        { error: "attemptId and answers required" },
        { status: 400 },
      );

    const attempt = await prisma.mockAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt)
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const blueprint = await prisma.examBlueprint.findUnique({
      where: { id: attempt.blueprintId ?? undefined },
      include: { sections: true },
    });

    if (!blueprint)
      return NextResponse.json(
        { error: "Blueprint not found" },
        { status: 404 },
      );

    // Score calculation - each answer gets marks for providing any response
    // For Phase 3, this is a basic scoring model. Full AI evaluation comes later.
    const totalQuestions = blueprint.sections.reduce(
      (s, sec) => s + sec.questionCount,
      0,
    );
    const answeredCount = Object.keys(answers as Record<string, string>).length;
    const score = Math.round(
      (answeredCount / totalQuestions) * attempt.totalMarks,
    );

    const results = blueprint.sections.map((sec) => ({
      sectionName: sec.name,
      totalMarks: sec.totalMarks,
      earned: Math.round((answeredCount / totalQuestions) * sec.totalMarks),
      questionCount: sec.questionCount,
    }));

    await prisma.mockAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        answers,
        results,
        timeTaken: timeTaken ?? null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      score,
      totalMarks: attempt.totalMarks,
      percentage: Math.round((score / attempt.totalMarks) * 100),
      results,
      sourceMode: attempt.sourceMode,
    });
  } catch (error) {
    console.error("Mock submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit mock" },
      { status: 500 },
    );
  }
}
