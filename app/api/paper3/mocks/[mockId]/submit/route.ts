import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateAnswer } from "@/lib/paper3/evaluate";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

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

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!mock) {
      return NextResponse.json(
        { error: "Mock exam not found" },
        { status: 404 },
      );
    }

    // Fetch the attempt to check if correct answer was viewed
    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId },
    });

    const correctAnswerViewed = attempt?.correctAnswerViewed ?? false;

    const results: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      marksEarned: number;
      totalMarks: number;
      feedback?: string;
      breakdown?: Array<{ criteria: string; marks: number; description: string }>;
    }> = [];
    let totalEarned = 0;

    for (const mq of mock.questions) {
      const userAnswer = answers[mq.question.id] || "";

      console.log(`[DEBUG] Question ${mq.question.id} (${mq.question.taskType}):`);
      console.log(`  UserAnswer: "${userAnswer}"`);
      console.log(`  ExpectedAnswer: "${mq.question.expectedAnswer}"`);
      console.log(`  partialCredit: ${mq.question.partialCredit}`);

      const result = await evaluateAnswer(
        {
          taskType: mq.question.taskType,
          expectedAnswer: mq.question.expectedAnswer,
          totalMarks: mq.marks,
          partialCredit: mq.question.partialCredit,
          markingBreakdown: mq.question.markingBreakdown as Array<{
            criteria: string;
            marks: number;
            description: string;
          }> | undefined,
          language: mq.question.programmingLanguage ?? undefined,
        },
        userAnswer,
      );

      // If correct answer was already viewed, no marks can be earned
      const finalMarksEarned = correctAnswerViewed ? 0 : result.marksEarned;

      // Create detailed result in database
      await prisma.paper3DetailedResult.create({
        data: {
          attemptId,
          questionId: mq.question.id,
          userAnswer,
          isCorrect: result.isCorrect,
          marksEarned: finalMarksEarned,
          totalMarks: result.totalMarks,
          feedback: result.feedback,
          breakdown: result.breakdown as unknown as Prisma.JsonObject,
          partialCredit: result.partialCredit,
        },
      });

      results.push({
        questionId: mq.question.id,
        userAnswer,
        isCorrect: result.isCorrect,
        marksEarned: finalMarksEarned,
        totalMarks: result.totalMarks,
        feedback: result.feedback,
        breakdown: result.breakdown,
      });

      totalEarned += finalMarksEarned;
    }

    const score = (totalEarned / mock.totalMarks) * 100;

    // Calculate points: tier-based + AI verification bonus
    const correctCount = results.filter((r) => r.isCorrect).length;
    const wrongCount = results.length - correctCount;
    const basePoints =
      score >= 80 ? 20 : score >= 60 ? 15 : score >= 40 ? 10 : 5;
    const aiBonus = correctCount * 2; // Verified correct = bonus points
    const pointsEarned = basePoints + aiBonus;

    const completedAttempt = await prisma.paper3MockAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        timeTaken,
        answers,
        results,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Create per-question attempt records for leaderboard
    const questionAttempts = await Promise.all(
      results.map((result) =>
        prisma.paper3QuestionAttempt.create({
          data: {
            questionId: result.questionId,
            mockId: mock.id,
            attemptId: attemptId,
            userId: session.user.id,
            userAnswer: result.userAnswer,
            isCorrect: result.isCorrect,
            marksEarned: result.marksEarned,
            score: (result.marksEarned / result.totalMarks) * 100,
          },
        }),
      ),
    );

    // Update Paper3UserStats
    const existingStats = await prisma.paper3UserStats.findUnique({
      where: { userId: session.user.id },
    });

    if (existingStats) {
      const newExamsTaken = existingStats.mockExamsTaken + 1;
      const newAvg =
        (existingStats.avgScore * existingStats.mockExamsTaken + score) / newExamsTaken;
      const newQuestionsCorrect =
        existingStats.questionsCorrect + correctCount;
      const newTotalPoints =
        existingStats.totalPoints + pointsEarned;

      await prisma.paper3UserStats.update({
        where: { userId: session.user.id },
        data: {
          mockExamsTaken: newExamsTaken,
          avgScore: Math.round(newAvg),
          questionsCorrect: newQuestionsCorrect,
          totalPoints: newTotalPoints,
        },
      });
    } else {
      await prisma.paper3UserStats.create({
        data: {
          userId: session.user.id,
          mockExamsTaken: 1,
          avgScore: score,
          questionsCorrect: correctCount,
          totalPoints: pointsEarned,
        },
      });
    }

    // Also update UserStats for unified leaderboard
    const existingUserStats = await prisma.userStats.findUnique({
      where: { userId: session.user.id },
    });

    if (existingUserStats) {
      await prisma.userStats.update({
        where: { userId: session.user.id },
        data: {
          totalPoints: existingUserStats.totalPoints + pointsEarned,
          quizzesTaken: existingUserStats.quizzesTaken + 1,
          lastActivityDate: new Date(),
        },
      });
    } else {
      await prisma.userStats.create({
        data: {
          userId: session.user.id,
          totalPoints: pointsEarned,
          quizzesTaken: 1,
          lastActivityDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      attempt: completedAttempt,
      results,
      totalEarned,
      score,
      pointsEarned,
      correctCount,
      wrongCount,
    });
  } catch (error) {
    console.error("Paper3 mock submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit exam" },
      { status: 500 },
    );
  }
}
