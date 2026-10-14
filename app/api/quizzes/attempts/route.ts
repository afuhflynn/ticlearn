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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let correctCount = 0;
    const attemptAnswers = [];

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

    const attempt = await prisma.quizAttempt.create({
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

    const userStats = await prisma.userStats.findFirst({
      where: { userId: session.user.id },
    });

    const pointsEarned = score >= 80 ? 20 : score >= 50 ? 10 : 5;
    let currentStreak = 1;
    let longestStreak = 1;

    if (userStats?.lastActivityDate) {
      const lastActivityDate = new Date(userStats.lastActivityDate);
      lastActivityDate.setHours(0, 0, 0, 0);

      if (lastActivityDate.getTime() === today.getTime()) {
        currentStreak = userStats.currentStreak || 1;
      } else if (lastActivityDate.getTime() === yesterday.getTime()) {
        currentStreak = (userStats.currentStreak || 0) + 1;
      }

      longestStreak = Math.max(userStats.longestStreak, currentStreak);
    }

    if (userStats) {
      await prisma.userStats.updateMany({
        where: { userId: session.user.id },
        data: {
          totalPoints: userStats.totalPoints + pointsEarned,
          quizzesTaken: userStats.quizzesTaken + 1,
          currentStreak,
          longestStreak,
          lastActivityDate: new Date(),
          avgScore: Math.round(
            (userStats.avgScore * userStats.quizzesTaken + score) /
              (userStats.quizzesTaken + 1),
          ),
        },
      });
    } else {
      await prisma.userStats.create({
        data: {
          userId: session.user.id,
          totalPoints: pointsEarned,
          quizzesTaken: 1,
          avgScore: score,
          currentStreak,
          longestStreak,
          lastActivityDate: new Date(),
        },
      });
    }

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
