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

    const { quizId, answers } = await req.json();

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let correctCount = 0;
    const attemptAnswers: Array<{
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string | null;
    }> = [];

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      let isCorrect = false;
      let explanation = question.explanation;

      if (question.type === "OPEN") {
        const gradingResult = await gradeOpenAnswer(
          question.question,
          answer.answer,
          question.correctAnswer,
          session.user.id,
        );

        const scoreMatch = gradingResult.match(/(\d{1,3})/);
        const aiScore = scoreMatch ? Number(scoreMatch[1]) : 0;
        isCorrect = aiScore >= 70;
        explanation =
          `${question.explanation ?? ""}\n\nAI feedback:\n${gradingResult}`.trim();
      } else {
        isCorrect = answer.answer === question.correctAnswer;
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

      attemptAnswers.push({
        questionId: question.id,
        question: question.question,
        userAnswer: answer.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation,
      });
    }

    const score = Math.round((correctCount / quiz.questions.length) * 100);
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
          score,
          totalQuestions: quiz.questions.length,
          correctAnswers: correctCount,
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
