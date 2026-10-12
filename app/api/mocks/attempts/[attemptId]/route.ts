import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";
import {
  parseStoredSessionPayload,
  sanitizeSessionPayloadForExaminee,
} from "@/lib/mock-session-payload";
import {
  scorePracticePayload,
  type MockReviewPerQuestionRow,
} from "@/lib/mock-scoring";

type SectionRollup = {
  sectionName: string;
  totalMarks: number;
  earned: number;
  questionCount?: number;
};

function parseStoredPracticeResults(results: unknown): {
  sections: SectionRollup[] | null;
  perQuestion: MockReviewPerQuestionRow[] | null;
} {
  if (!results || typeof results !== "object" || Array.isArray(results))
    return { sections: null, perQuestion: null };
  const rec = results as Record<string, unknown>;
  const perQuestion =
    Array.isArray(rec.perQuestion) && rec.perQuestion.length > 0
      ? (rec.perQuestion as MockReviewPerQuestionRow[])
      : null;
  const sections =
    Array.isArray(rec.sections) && rec.sections.length > 0
      ? (rec.sections as SectionRollup[])
      : null;
  return { sections, perQuestion };
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ attemptId: string }>;
  },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const { attemptId } = await params;
    const attempt = await prisma.mockAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        examProfileId: true,
        blueprintId: true,
        answers: true,
        sessionPayload: true,
        score: true,
        totalMarks: true,
        sourceMode: true,
        timeTaken: true,
        completedAt: true,
        results: true,
      },
    });

    if (!attempt)
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    if (attempt.examProfileId !== profileId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answersRaw = attempt.answers;
    const answersData: Record<string, unknown> =
      answersRaw !== null &&
      answersRaw !== undefined &&
      typeof answersRaw === "object" &&
      !Array.isArray(answersRaw)
        ? (answersRaw as Record<string, unknown>)
        : {};

    const sessionPayload = parseStoredSessionPayload(attempt.sessionPayload);

    const completed = Boolean(attempt.completedAt);

    let graded: ReturnType<typeof scorePracticePayload> | null = null;
    if (sessionPayload) {
      graded = scorePracticePayload(sessionPayload, answersData);
    }

    const parsedResults = parseStoredPracticeResults(attempt.results);

    const perQuestionReview: MockReviewPerQuestionRow[] | null = graded
      ?.perQuestion?.length
      ? graded.perQuestion
      : parsedResults.perQuestion?.length
        ? parsedResults.perQuestion
        : null;

    const sectionRollup = graded?.sectionRows?.length
      ? graded.sectionRows
      : parsedResults.sections;

    const review =
      completed && perQuestionReview && perQuestionReview.length > 0
        ? {
            perQuestion: perQuestionReview,
            sectionSummary:
              Array.isArray(sectionRollup) && sectionRollup.length > 0
                ? sectionRollup
                : null,
          }
        : null;

    if (sessionPayload) {
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
          name: sessionPayload.displayName,
          durationMin: sessionPayload.durationMin,
          totalMarks: sessionPayload.totalMarks,
        },
        sections: sanitizeSessionPayloadForExaminee(sessionPayload).sections,
        answers: answersData as Record<string, string>,
        review,
      });
    }

    const blueprint =
      attempt.blueprintId != null
        ? await prisma.examBlueprint.findUnique({
            where: { id: attempt.blueprintId },
            select: {
              name: true,
              durationMin: true,
              totalMarks: true,
              sections: {
                orderBy: { order: "asc" },
                select: {
                  name: true,
                  questionCount: true,
                  totalMarks: true,
                  questionType: true,
                  answerRule: true,
                  marksPerQuestion: true,
                  order: true,
                },
              },
            },
          })
        : null;

    if (blueprint) {
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
          name: blueprint.name,
          durationMin: blueprint.durationMin,
          totalMarks: blueprint.totalMarks,
        },
        sections: blueprint.sections.map((sec) => ({
          name: sec.name,
          questionCount: sec.questionCount,
          totalMarks: sec.totalMarks,
          questionType: sec.questionType,
          answerRule: sec.answerRule,
          marksPerQuestion: sec.marksPerQuestion,
          questions: Array.from({ length: sec.questionCount }, (_, i) => ({
            questionId: `legacy_place_${sec.order}_${i}`,
            text: "",
            type: sec.questionType,
            marks:
              sec.marksPerQuestion ??
              Math.ceil(sec.totalMarks / Math.max(sec.questionCount, 1)),
          })),
        })),
        answers: answersData as Record<string, string>,
        /** Legacy blueprint-only attempts do not expose per-item stems/keys. */
        review,
      });
    }

    return NextResponse.json(
      {
        error: "This mock session could not be loaded (missing syllabus data).",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("Mock attempt GET error:", error);
    return NextResponse.json(
      { error: "Failed to load attempt" },
      { status: 500 },
    );
  }
}
