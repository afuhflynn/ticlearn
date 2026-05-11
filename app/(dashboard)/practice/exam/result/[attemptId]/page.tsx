"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  usePaper3MockAttempt,
  useStartPaper3MockExam,
  useViewPaper3CorrectAnswer,
} from "@/hooks";
import { usePlan } from "@/hooks/usePlan";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Target,
  BookOpen,
  Eye,
  Lock,
  Loader2,
  Code,
  FileText,
  Award,
  Crown,
  Share2,
  Copy,
  Check,
  Star,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { TiCExamAssistant } from "@/components/paper3/TiCExamAssistant";
import ReactMarkdown from "react-markdown";
import { HtmlPreview } from "@/components/paper3/HtmlPreview";
import { isHtmlQuestion } from "@/lib/paper3/evaluate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProcessingStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

interface CorrectAnswer {
  questionId: string;
  questionNumber: string;
  title: string;
  taskType: string;
  expectedAnswer: string;
  explanation: string | null;
}

export default function ExamResultPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const { data, isLoading, refetch, isFetching } =
    usePaper3MockAttempt(attemptId);
  const startExam = useStartPaper3MockExam();
  const viewCorrectAnswer = useViewPaper3CorrectAnswer();
  const attempt = data?.attempt;
  const analytics = (
    data as unknown as {
      analytics?: { bySection: Array<{ section: string; percentage: number }> };
    }
  )?.analytics;
  const correctAnswerViewed = attempt?.correctAnswerViewed ?? false;
  const processingStatus = (attempt?.processingStatus ??
    "COMPLETED") as ProcessingStatus;
  const isProcessing =
    processingStatus === "QUEUED" || processingStatus === "PROCESSING";

  const { canViewCorrectAnswers, isPending } = usePlan();

  const [showProcessingBanner, setShowProcessingBanner] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<CorrectAnswer[]>([]);
  const [showRevealForm, setShowRevealForm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [selectedQuestionForAI, setSelectedQuestionForAI] = useState<string | null>(null);

  useEffect(() => {
    if (isProcessing) {
      setShowProcessingBanner(true);
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    } else if (showProcessingBanner) {
      setShowProcessingBanner(false);
    }
  }, [isProcessing, refetch, showProcessingBanner]);

  useEffect(() => {
    if (!isProcessing && !feedbackSubmitted) {
      const hasSeenFeedback = localStorage.getItem(`feedback_seen_${attemptId}`);
      if (!hasSeenFeedback) {
        setTimeout(() => setShowFeedbackModal(true), 2000);
      }
    }
  }, [isProcessing, feedbackSubmitted, attemptId]);

  const handleSubmitFeedback = async () => {
    if (feedbackSubmitted) return;
    setIsSubmittingFeedback(true);
    try {
      await fetch("/api/feedback/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackMessage || `Difficulty: ${feedbackDifficulty || "Not specified"}. ${feedbackRating ? `Rating: ${feedbackRating}/5` : ""}`,
          rating: feedbackRating,
          attemptId,
          mockId: attempt?.mock?.id,
        }),
      });
      setFeedbackSubmitted(true);
      localStorage.setItem(`feedback_seen_${attemptId}`, "true");
      setShowFeedbackModal(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSkipFeedback = () => {
    localStorage.setItem(`feedback_seen_${attemptId}`, "true");
    setShowFeedbackModal(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleRevealAnswers = async () => {
    if (!canViewCorrectAnswers && !isPending) {
      setUpgradeFeature("View Correct Answers");
      setShowUpgradeModal(true);
      return;
    }

    if (correctAnswerViewed) {
      setShowRevealForm(true);
      return;
    }

    try {
      const res = await fetch(`/api/paper3/attempts/${attemptId}/view-answer`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.correctAnswers) {
        setRevealedAnswers(data.correctAnswers);
        setShowRevealForm(true);
      }
      refetch();
    } catch (error) {
      console.error("Failed to reveal answers:", error);
    }
  };

  const handleRetake = async () => {
    if (!attempt?.mock) return;
    try {
      const res = await startExam.mutateAsync({ mockId: attempt.mock.id });
      if (res.attempt) router.push(`/practice/exam/${attempt.mock.id}`);
    } catch (error) {
      console.error("Failed to retake exam:", error);
    }
  };

  const handleShare = async () => {
    if (!shareId) {
      setIsSharing(true);
      try {
        const res = await fetch(`/api/paper3/attempts/${attemptId}/share`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (data.shareUrl) {
          setShareUrl(data.shareUrl);
          setShareId(data.shareId);
        }
      } catch (error) {
        console.error("Failed to share:", error);
      } finally {
        setIsSharing(false);
      }
    } else {
      const url = `${window.location.origin}/result/${shareId}`;
      setShareUrl(url);
    }
  };

  const copyShareLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
    feedback?: string;
    feedbackMd?: string | null;
    breakdown?: Array<{ criteria: string; marks: number; description: string }>;
  }>;

  const totalEarned = results.reduce((sum, r) => sum + r.marksEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.totalMarks, 0);

  const getCorrectAnswer = (questionId: string): CorrectAnswer | undefined => {
    return revealedAnswers.find((a) => a.questionId === questionId);
  };

  const getResultStyles = (
    isCorrect: boolean,
    partialCredit: boolean,
    requireAnswer: boolean,
  ) => {
    if (!requireAnswer) {
      return "bg-blue-50 border-blue-200";
    }
    if (isCorrect) {
      return "bg-green-50 border-green-200";
    }
    if (partialCredit) {
      return "bg-yellow-50 border-yellow-200";
    }
    return "bg-red-50 border-red-200";
  };

  const getResultIcon = (
    isCorrect: boolean,
    partialCredit: boolean,
    requireAnswer: boolean,
  ) => {
    if (!requireAnswer) {
      return <Award className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />;
    }
    if (isCorrect) {
      return <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />;
    }
    if (partialCredit) {
      return (
        <div className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5 shrink-0">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      );
    }
    return <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />;
  };

  const renderAnswerContent = (
    content: string,
    taskType: string,
    label: string,
    isCorrect: boolean,
  ) => {
    const isHtml = isHtmlQuestion(taskType);

    return (
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        {isHtml ? (
          <HtmlPreview
            html={content}
            className="py-4 min-h-[200px]"
            showToggle={true}
            defaultOpen={true}
          />
        ) : (
          <div
            className={`p-3 rounded-lg ${
              isCorrect
                ? "bg-green-50 border border-green-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            {taskType === "C_PROGRAM" ||
            taskType === "PASCAL_PROGRAM" ||
            taskType === "ALGORITHM_PSEUDOCODE" ? (
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                <code>{content}</code>
              </pre>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto max-w-3xl px-4">
        {showProcessingBanner && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">
                Processing your exam...
              </p>
              <p className="text-sm text-blue-600">
                AI is evaluating your answers. This page will update
                automatically.
              </p>
            </div>
            {isFetching && (
              <span className="ml-auto text-xs text-blue-400">
                Refreshing...
              </span>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {isProcessing ? "Processing..." : "Exam Complete!"}
            </h1>
            <p className="text-gray-500">
              {attempt?.completedAt
                ? formatRelativeTime(attempt.completedAt)
                : "Submitted just now"}
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
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  ) : (
                    Math.round(attempt?.score ?? 0)
                  )}
                </span>
                {!isProcessing && (
                  <span className="text-sm text-gray-500">%</span>
                )}
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
                <Target className="h-4 w-4" /> Performance by Topic
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {analytics.bySection?.map(
                  (topic: { section: string; percentage: number }) => (
                    <div key={topic.section} className="bg-white p-3 rounded">
                      <p className="text-xs font-medium text-gray-600">
                        {topic.section}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              topic.percentage >= 70
                                ? "bg-green-500"
                                : topic.percentage >= 40
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${topic.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">
                          {topic.percentage}%
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {correctAnswerViewed && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Lock className="h-4 w-4" />
                <p className="text-sm font-medium">
                  You have viewed the correct answers. Retaking this exam will
                  not earn any marks.
                </p>
              </div>
            </div>
          )}

          {!isProcessing && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {canViewCorrectAnswers || isPending ? (
                <button
                  type="button"
                  onClick={handleRevealAnswers}
                  disabled={viewCorrectAnswer.isPending}
                  className="flex-1 py-3 text-center border border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {correctAnswerViewed
                    ? "View Answers"
                    : "View Correct Answers"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeFeature("View Correct Answers");
                    setShowUpgradeModal(true);
                  }}
                  className="flex-1 py-3 text-center border border-gray-300 text-gray-500 rounded-lg flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  View Correct Answers
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
                  Leaderboard
                </Link>
              )}
              {shareUrl ? (
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="flex-1 py-3 text-center border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex-1 py-3 text-center border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {isSharing ? "Sharing..." : "Share Result"}
                </button>
              )}
              <button
                type="button"
                onClick={handleRetake}
                disabled={startExam.isPending}
                className="flex-1 py-3 text-center bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {startExam.isPending ? "Retaking..." : "Retake Exam"}
              </button>
            </div>
          )}
        </div>

        {!isProcessing && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-lg font-bold mb-4">Question Breakdown</h2>
            <div className="space-y-4">
              {results.map((result, index) => {
                const question = attempt?.mock?.questions[index]?.question;
                const detailedResult = attempt?.detailedResults?.[index];
                const correctAnswer = getCorrectAnswer(result.questionId);
                const requireAnswer = question?.requireAnswer !== false;
                const taskType = question?.taskType ?? "INPUT_FIELD";
                const isHtml = isHtmlQuestion(taskType, question?.contentMd);

                const partialMarks =
                  result.marksEarned > 0 &&
                  result.marksEarned < result.totalMarks;

                return (
                  <div
                    key={result.questionId}
                    className={`p-4 rounded-lg border h-auto ${getResultStyles(
                      result.isCorrect,
                      partialMarks,
                      requireAnswer,
                    )}`}
                  >
                    <div className="flex items-start gap-3 mb-3 h-auto">
                      {getResultIcon(
                        result.isCorrect,
                        partialMarks,
                        requireAnswer,
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Question {index + 1}
                                {question?.questionNumber &&
                                  ` (${question.questionNumber})`}
                              </span>
                              <button
                                onClick={() => setSelectedQuestionForAI(result.questionId)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Ask TiC
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {question?.title ||
                                question?.content?.slice(0, 80)}
                            </p>
                            {!requireAnswer && (
                              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Practical Task
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={cn(
                                `text-sm font-bold ${
                                  result.isCorrect
                                    ? "text-green-600"
                                    : partialMarks
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`,
                                !requireAnswer ? "hidden" : "block",
                              )}
                            >
                              {result.marksEarned}/{result.totalMarks}
                            </span>
                          </div>
                        </div>

                        {question?.concepts &&
                          (question.concepts as string[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(question.concepts as string[])
                                .slice(0, 3)
                                .map((concept: string, ci: number) => (
                                  <span
                                    key={ci}
                                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                  >
                                    {concept}
                                  </span>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>

                    {requireAnswer && (
                      <div className="space-y-3 mt-3">
                        {renderAnswerContent(
                          result.userAnswer || "(No answer provided)",
                          taskType,
                          "Your Answer:",
                          result.isCorrect,
                        )}

                        {showRevealForm && correctAnswer && (
                          <>
                            {renderAnswerContent(
                              correctAnswer.expectedAnswer,
                              taskType,
                              "Correct Answer:",
                              true,
                            )}

                            {correctAnswer.explanation && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-800 mb-1">
                                  Explanation
                                </p>
                                <p className="text-sm text-blue-700">
                                  {correctAnswer.explanation}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {(detailedResult?.feedbackMd ||
                          detailedResult?.feedback ||
                          result.feedbackMd ||
                          result.feedback) && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg text-wrap">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              {result.isCorrect ? "Explanation" : "Feedback"}
                            </p>
                            {detailedResult?.feedbackMd ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>
                                  {detailedResult.feedbackMd}
                                </ReactMarkdown>
                              </div>
                            ) : result.feedbackMd ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>
                                  {result.feedbackMd}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-700">
                                {detailedResult?.feedback || result.feedback}
                              </p>
                            )}
                          </div>
                        )}

                        {detailedResult?.codeExplanation && (
                          <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-x-auto">
                            <pre className="text-xs text-gray-100 whitespace-pre-wrap">
                              <code>{detailedResult.codeExplanation}</code>
                            </pre>
                          </div>
                        )}

                        {result.breakdown && result.breakdown.length > 0 && (
                          <div className="mt-3 p-3 bg-white border rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Marking Breakdown:
                            </p>
                            <div className="space-y-1">
                              {result.breakdown.map((item, bi) => (
                                <div
                                  key={bi}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-gray-600">
                                    {item.description || item.criteria}
                                  </span>
                                  <span
                                    className={`font-medium ${
                                      item.marks > 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {item.marks}/{item.marks || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!requireAnswer && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-600 italic">
                          This practical task was evaluated automatically. Your
                          score reflects your practical work completion.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isProcessing && (
          <TiCExamAssistant 
            attemptId={attemptId} 
            questionId={selectedQuestionForAI}
          />
        )}
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              {upgradeFeature} requires a Premium subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Unlimited exam retakes</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>View correct answers with explanations</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>AI-powered exam assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-500" />
                <span>Shareable result cards</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Maybe Later
            </Button>
            <Button onClick={() => router.push("/subscription")}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
              Help Us Improve
            </DialogTitle>
            <DialogDescription>
              How was your exam experience? Your feedback helps us get better.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Rate your experience</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star === feedbackRating ? 0 : star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= feedbackRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Difficulty level</p>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFeedbackDifficulty(level === feedbackDifficulty ? "" : level)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      level === feedbackDifficulty
                        ? level === "Easy"
                          ? "bg-green-100 border-green-500 text-green-700"
                          : level === "Medium"
                          ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                          : "bg-red-100 border-red-500 text-red-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Any suggestions? (optional)</p>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {feedbackMessage.length}/500
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkipFeedback}
            >
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
