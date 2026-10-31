import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { explainMCQAnswer, gradeOpenAnswer } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { trackEvent } from "@/lib/kpi";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, answers, source, conversationId, clientRunId } =
      await req.json();

    // The client sends source as a hint. The server allowlists it and
    // writes the final value, so an unknown string never lands in the row.
    const allowedSource =
      source === "chat" || source === "page" ? source : null;

    if (!quizId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "Answers must be a non empty array" },
        { status: 422 },
      );
    }

    if (answers.length > 200) {
      return NextResponse.json(
        { error: "Too many answers in one submit" },
        { status: 422 },
      );
    }

    // A duplicate client run id returns the existing attempt so a retry of the
    // same run never writes a second attempt row.
    if (clientRunId) {
      const existing = await prisma.quizAttempt.findFirst({
        where: { clientRunId },
        include: { answers: true },
      });

      if (existing) {
        trackEvent(session.user.id, "quiz_taken", {
          quizId: existing.quizId,
          score: existing.score,
          correctCount: existing.correctAnswers,
          totalQuestions: existing.totalQuestions,
          source: existing.source,
        }).catch(() => {});

        return NextResponse.json({
          attempt: existing,
          success: true,
          pointsEarned: 0,
          currentStreak: 0,
          duplicate: true,
        });
      }
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // A quiz id that is not the caller's own reads as not found, the same
    // rule the page routes enforce.
    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let correctCount = 0;
    let totalMarks = 0;
    let marksEarned = 0;
    const attemptAnswers: Array<{
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string | null;
      marksEarned: number;
      marksTotal: number;
      markSchemeMd: string | null;
    }> = [];

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const marksTotal = (question as { marks?: number }).marks ?? 1;
      const schemeMd =
        (question as { markSchemeMd?: string | null }).markSchemeMd ?? null;
      totalMarks += marksTotal;

      let isCorrect = false;
      let explanation = question.explanation;
      let earned = 0;

      if (question.type === "OPEN") {
        const gradingResult = await gradeOpenAnswer(
          question.question,
          answer.answer,
          question.correctAnswer,
          session.user.id,
        );

        const scoreMatch = gradingResult.match(/(\d{1,3})/);
        const aiScore = scoreMatch ? Number(scoreMatch[1]) : 0;
        const safeScore = Math.min(100, Math.max(0, aiScore));
        isCorrect = safeScore >= 70;
        earned = Math.min(
          marksTotal,
          Math.round((safeScore / 100) * marksTotal),
        );
        explanation =
          `${question.explanation ?? ""}\n\nAI feedback:\n${gradingResult}`.trim();
      } else {
        isCorrect = answer.answer === question.correctAnswer;
        earned = isCorrect ? marksTotal : 0;
        if (!isCorrect) {
          const aiExplanation = await explainMCQAnswer(
            question.question,
            answer.answer,
            question.correctAnswer,
            question.options,
            session.user.id,
          );
          explanation =
            `${question.explanation ?? ""}\n\n${aiExplanation}`.trim();
        }
      }

      if (isCorrect) correctCount++;
      marksEarned += earned;

      attemptAnswers.push({
        questionId: question.id,
        question: question.question,
        userAnswer: answer.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation,
        marksEarned: earned,
        marksTotal,
        markSchemeMd: schemeMd,
      });
    }

    const score =
      totalMarks > 0
        ? Math.round((marksEarned / totalMarks) * 100)
        : Math.round((correctCount / quiz.questions.length) * 100);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const pointsEarned = score >= 80 ? 20 : score >= 50 ? 10 : 5;

    const { attempt, currentStreak } = await prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          userId: session.user.id,
          quizId,
          quizTitle: quiz.title,
          noteTitle: quiz.noteTitle,
          source: allowedSource,
          conversationId: conversationId ?? null,
          clientRunId: clientRunId ?? null,
          score,
          totalQuestions: quiz.questions.length,
          correctAnswers: correctCount,
          totalMarks,
          marksEarned,
          answers: {
            create: attemptAnswers,
          },
        },
        include: {
          answers: true,
        },
      });

      const existing = await tx.userStats.findFirst({
        where: { userId: session.user.id },
      });

      let nextStreak = 1;
      let nextLongest = 1;

      if (existing?.lastActivityDate) {
        const lastActivityDate = new Date(existing.lastActivityDate);
        lastActivityDate.setHours(0, 0, 0, 0);

        if (lastActivityDate.getTime() === today.getTime()) {
          nextStreak = existing.currentStreak || 1;
        } else if (lastActivityDate.getTime() === yesterday.getTime()) {
          nextStreak = (existing.currentStreak || 0) + 1;
        }

        nextLongest = Math.max(existing.longestStreak, nextStreak);
      }

      if (existing) {
        await tx.userStats.updateMany({
          where: { userId: session.user.id },
          data: {
            totalPoints: { increment: pointsEarned },
            quizzesTaken: { increment: 1 },
            currentStreak: nextStreak,
            longestStreak: nextLongest,
            lastActivityDate: new Date(),
            avgScore: Math.round(
              (existing.avgScore * existing.quizzesTaken + score) /
                (existing.quizzesTaken + 1),
            ),
          },
        });
      } else {
        await tx.userStats.create({
          data: {
            userId: session.user.id,
            totalPoints: pointsEarned,
            quizzesTaken: 1,
            avgScore: score,
            currentStreak: nextStreak,
            longestStreak: nextLongest,
            lastActivityDate: new Date(),
          },
        });
      }

      return { attempt, currentStreak: nextStreak };
    });

    trackEvent(session.user.id, "quiz_taken", {
      quizId,
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
      source: allowedSource ?? undefined,
    }).catch(() => {});

    return NextResponse.json({
      attempt,
      success: true,
      pointsEarned,
      currentStreak,
    });
  } catch (error) {
    console.error("Submit attempt error:", error);
    return NextResponse.json(
      { error: "Failed to submit attempt" },
      { status: 500 },
    );
  }
}
