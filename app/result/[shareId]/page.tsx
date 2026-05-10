import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle, XCircle, Award, Clock, Target, BookOpen } from "lucide-react";

interface ResultPageProps {
  params: Promise<{ shareId: string }>;
}

async function getSharedResult(shareId: string) {
  const attempt = await prisma.paper3MockAttempt.findUnique({
    where: { shareId },
    select: {
      id: true,
      score: true,
      totalMarks: true,
      timeTaken: true,
      completedAt: true,
      startedAt: true,
      mock: {
        select: {
          id: true,
          title: true,
          subject: true,
          totalMarks: true,
          focusCategory: true,
        },
      },
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      results: true,
    },
  });
  return attempt;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBgColor(score: number) {
  if (score >= 80) return "bg-green-100";
  if (score >= 60) return "bg-yellow-100";
  return "bg-red-100";
}

export default async function SharedResultPage({ params }: ResultPageProps) {
  const { shareId } = await params;
  const attempt = await getSharedResult(shareId);

  if (!attempt) {
    notFound();
  }

  const results = attempt.results as Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    marksEarned: number;
    totalMarks: number;
  }>;

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalQuestions = results.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Award className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Paper 3 Exam Result</h1>
          </div>
          <p className="text-gray-500">
            {attempt.user.name} completed {attempt.mock.title}
          </p>
        </div>

        <div className={`rounded-2xl p-8 ${getScoreBgColor(attempt.score)}`}>
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.2" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
                  strokeDasharray={`${attempt.score * 2.83} 283`}
                  strokeLinecap="round"
                  className={getScoreColor(attempt.score)}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-4xl font-bold ${getScoreColor(attempt.score)}`}>
                  {Math.round(attempt.score)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{correctCount}</p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalQuestions - correctCount}</p>
                <p className="text-sm text-gray-600">Wrong</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {attempt.timeTaken ? Math.floor(attempt.timeTaken / 60) : 0}m
                </p>
                <p className="text-sm text-gray-600">Time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Mock</p>
            <p className="font-medium">{attempt.mock.title}</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Subject</p>
            <p className="font-medium">{attempt.mock.subject}</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" /> Performance Summary
          </h2>
          <div className="space-y-3">
            {results.slice(0, 10).map((result, index) => (
              <div key={index} className="flex items-center gap-3">
                {result.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span className="text-sm">Question {index + 1}</span>
                <span className="ml-auto text-sm font-medium">
                  {result.marksEarned}/{result.totalMarks}
                </span>
              </div>
            ))}
            {results.length > 10 && (
              <p className="text-sm text-gray-500 text-center">
                +{results.length - 10} more questions
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Want to track your own progress?
          </p>
          <a
            href="/practice"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <BookOpen className="h-4 w-4" />
            Start Practicing
          </a>
        </div>
      </div>
    </div>
  );
}