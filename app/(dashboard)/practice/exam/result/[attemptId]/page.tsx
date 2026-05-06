"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePaper3MockAttempt } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";

export default function ExamResultPage() {
  const _router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const { data, isLoading } = usePaper3MockAttempt(attemptId);
  const attempt = data?.attempt;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const results = (attempt?.results ?? []) as Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    marksEarned: number;
    totalMarks: number;
  }>;

  const totalEarned = results.reduce((sum, r) => sum + r.marksEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.totalMarks, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Exam Complete!
            </h1>
            <p className="text-gray-500">
              {formatRelativeTime(attempt?.completedAt)}
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <title>Score progress</title>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(attempt?.score ?? 0) * 2.83} 283`}
                  strokeLinecap="round"
                  className={getScoreColor(attempt?.score ?? 0)}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute text-center">
                <span
                  className={`text-3xl md:text-4xl font-bold ${getScoreColor(
                    attempt?.score ?? 0,
                  )}`}
                >
                  {Math.round(attempt?.score ?? 0)}
                </span>
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{totalEarned}</p>
              <p className="text-xs text-gray-500">Marks Earned</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">{totalPossible}</p>
              <p className="text-xs text-gray-500">Total Marks</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">
                {results.filter((r) => r.isCorrect).length}
              </p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold">
                {Math.floor((attempt?.timeTaken ?? 0) / 60)}m
              </p>
              <p className="text-xs text-gray-500">Time Taken</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/practice"
              className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50"
            >
              Practice More
            </Link>
            <Link
              href="/leaderboard"
              className="flex-1 py-3 text-center bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-bold mb-4">Question Breakdown</h2>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={result.questionId}
                className={`p-4 rounded-lg border ${
                  result.isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-medium">
                      Question {index + 1}
                    </span>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {result.userAnswer || "(No answer)"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      result.isCorrect ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.marksEarned}/{result.totalMarks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
