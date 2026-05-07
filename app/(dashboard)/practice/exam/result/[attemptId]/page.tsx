"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePaper3MockAttempt, useStartPaper3MockExam, useViewPaper3CorrectAnswer } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { CheckCircle, XCircle, Trophy, Target, BookOpen, Eye, Lock } from "lucide-react";
import { TiCExamAssistant } from "@/components/paper3/TiCExamAssistant";

export default function ExamResultPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const { data, isLoading, refetch } = usePaper3MockAttempt(attemptId);
  const startExam = useStartPaper3MockExam();
  const viewCorrectAnswer = useViewPaper3CorrectAnswer();
  const attempt = data?.attempt;
  const analytics = (data as unknown as { analytics?: { bySection: Array<{ section: string; percentage: number }> } })?.analytics;
  const correctAnswerViewed = attempt?.correctAnswerViewed ?? false;

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
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
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
                <span className={`text-3xl md:text-4xl font-bold ${getScoreColor(attempt?.score ?? 0)}`}>
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

          {analytics && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Performance by Topic
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {analytics.bySection?.map((topic: { section: string; percentage: number }) => (
                  <div key={topic.section} className="bg-white p-3 rounded">
                    <p className="text-xs font-medium text-gray-600">{topic.section}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            topic.percentage >= 70 ? "bg-green-500" : topic.percentage >= 40 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{topic.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.filter((r) => !r.isCorrect).length > 0 && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Questions to Review
              </h3>
              <div className="space-y-2">
                {results
                  .map((result, index) => ({ ...result, index }))
                  .filter((r) => !r.isCorrect)
                  .map((r) => {
                    const q = attempt?.mock?.questions[r.index]?.question;
                    return (
                      <Link
                        key={r.questionId}
                        href={`/leaderboard?questionId=${r.questionId}`}
                        className="flex items-center justify-between p-2 bg-white rounded text-sm hover:bg-gray-50"
                      >
                        <span className="truncate">Q{r.index + 1}: {q?.title?.slice(0, 50)}...</span>
                        <span className="text-orange-600 text-xs">View Leaderboard →</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}

          {correctAnswerViewed && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Lock className="h-4 w-4" />
                <p className="text-sm font-medium">
                  You have viewed the correct answers. Retaking this exam will not earn any marks.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {!correctAnswerViewed && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await viewCorrectAnswer.mutateAsync(attemptId);
                    refetch();
                  } catch (error) {
                    console.error("Failed to view correct answer:", error);
                  }
                }}
                disabled={viewCorrectAnswer.isPending}
                className="flex-1 py-3 text-center border border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {viewCorrectAnswer.isPending ? "Revealing..." : "View Correct Answers"}
              </button>
            )}
            <Link
              href="/practice"
              className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50"
            >
              Practice More
            </Link>
            {attempt?.mock && (
              <Link
                href={`/leaderboard?mockId=${attempt.mock.id}`}
                className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50"
              >
                View Leaderboard
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!attempt?.mock) return;
                try {
                  const res = await startExam.mutateAsync({ mockId: attempt.mock.id });
                  if (res.attempt) {
                    router.push(`/practice/exam/${attempt.mock.id}`);
                  }
                } catch (error) {
                  console.error("Failed to retake exam:", error);
                }
              }}
              disabled={startExam.isPending}
              className="flex-1 py-3 text-center bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {startExam.isPending ? "Retaking..." : "Retake Exam"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-bold mb-4">Question Breakdown</h2>
          <div className="space-y-4">
            {results.map((result, index) => {
              const question = attempt?.mock?.questions[index]?.question;
              const detailedResult = attempt?.detailedResults?.[index];
              return (
                <div
                  key={result.questionId}
                  className={`p-4 rounded-lg border ${
                    result.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {result.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <span className="text-sm font-medium">Question {index + 1}</span>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {question?.title || question?.content?.slice(0, 100)}
                        </p>
                        {question?.concepts && (question.concepts as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(question.concepts as string[]).slice(0, 3).map((concept: string, ci: number) => (
                              <span key={ci} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                {concept}
                              </span>
                            ))}
                            {(question.concepts as string[]).length > 3 && (
                              <span className="text-xs text-gray-400">+{(question.concepts as string[]).length - 3}</span>
                            )}
                          </div>
                        )}
                        {detailedResult?.feedback && (
                          <p className="text-xs mt-2 text-gray-600">{detailedResult.feedback}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TiCExamAssistant attemptId={attemptId} />
      </div>
    </div>
  );
}