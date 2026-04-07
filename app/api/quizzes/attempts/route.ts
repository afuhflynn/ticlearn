import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

      const isCorrect = answer.answer === question.correctAnswer;
      if (isCorrect) correctCount++;

      attemptAnswers.push({
        questionId: question.id,
        question: question.question,
        userAnswer: answer.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      });
    }

    const score = Math.round((correctCount / quiz.questions.length) * 100);

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
    });

    const userStats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    });

    const pointsEarned = score >= 80 ? 20 : score >= 50 ? 10 : 5;

    if (userStats) {
      await prisma.userStats.update({
        where: { userId: session.user.id },
        data: {
          totalPoints: userStats.totalPoints + pointsEarned,
          quizzesTaken: userStats.quizzesTaken + 1,
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
          currentStreak: 1,
          longestStreak: 1,
        },
      });
    }

    return NextResponse.json({ attempt, success: true });
  } catch (error) {
    console.error("Submit attempt error:", error);
    return NextResponse.json(
      { error: "Failed to submit attempt" },
      { status: 500 },
    );
  }
}
