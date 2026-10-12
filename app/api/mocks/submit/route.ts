import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";
import { parseStoredSessionPayload } from "@/lib/mock-session-payload";
import { scorePracticePayload } from "@/lib/mock-scoring";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

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

    if (attempt.examProfileId !== profileId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const payload = parseStoredSessionPayload(attempt.sessionPayload);

    const blueprint =
      !payload && attempt.blueprintId
        ? await prisma.examBlueprint.findUnique({
            where: { id: attempt.blueprintId },
            include: { sections: true },
          })
        : null;

    if (!payload && !blueprint)
      return NextResponse.json(
        { error: "Exam session not available" },
        { status: 400 },
      );

    const totalQuestions = payload
      ? payload.sections.reduce((s, sec) => s + sec.questionCount, 0)
      : blueprint
        ? blueprint.sections.reduce((s, sec) => s + sec.questionCount, 0)
        : 0;

    const answeredCount = Object.keys(answers as Record<string, string>).length;

    let score: number;
    let results: Prisma.InputJsonValue;

    if (payload) {
      const graded = scorePracticePayload(
        payload,
        answers as Record<string, unknown>,
      );
      score = Math.min(graded.score, attempt.totalMarks);
      results = {
        sections: graded.sectionRows,
        perQuestion: graded.perQuestion,
      };
    } else {
      score =
        totalQuestions > 0
          ? Math.round((answeredCount / totalQuestions) * attempt.totalMarks)
          : 0;
      results =
        blueprint?.sections.map((sec) => ({
          sectionName: sec.name,
          totalMarks: sec.totalMarks,
          earned:
            totalQuestions > 0
              ? Math.round((answeredCount / totalQuestions) * sec.totalMarks)
              : 0,
          questionCount: sec.questionCount,
        })) ?? [];
    }

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
      percentage:
        attempt.totalMarks > 0
          ? Math.round((score / attempt.totalMarks) * 100)
          : 0,
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
