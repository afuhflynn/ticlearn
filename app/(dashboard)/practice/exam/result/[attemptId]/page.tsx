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
  Sparkles,
} from "lucide-react";
import { PerQuestionChat } from "@/components/paper3/PerQuestionChat";
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
  const [selectedQuestionForAI, setSelectedQuestionForAI] = useState<
    string | null
  >(null);
  const [openPerQuestionChats, setOpenPerQuestionChats] = useState<Set<string>>(
    new Set(),
  );

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
      const hasSeenFeedback = localStorage.getItem(
        `feedback_seen_${attemptId}`,
      );
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
          message:
            feedbackMessage ||
            `Difficulty: ${feedbackDifficulty || "Not specified"}. ${feedbackRating ? `Rating: ${feedbackRating}/5` : ""}`,
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

  const getShareText = () => {
    const grade =
      attempt?.score !== undefined
        ? attempt.score >= 80
          ? "A"
          : attempt.score >= 70
            ? "B"
            : attempt.score >= 60
              ? "C"
              : attempt.score >= 50
                ? "D"
                : "F"
        : "";
    return `I just scored ${grade} (${Math.round(attempt?.score ?? 0)}%) on my GCE Paper 3 exam! Check out TiCLearn to prepare for your exams.`;
  };

  const handleTwitterShare = () => {
    if (!shareUrl) {
      handleShare().then(() => {
        const url = `${window.location.origin}/result/${shareId}`;
        const text = encodeURIComponent(getShareText());
        window.open(
          `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
          "_blank",
        );
      });
    } else {
      const text = encodeURIComponent(getShareText());
      window.open(
        `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
        "_blank",
      );
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) {
      handleShare().then(() => {
        const url = `${window.location.origin}/result/${shareId}`;
        const text = encodeURIComponent(`${getShareText()} ${url}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      });
    } else {
      const text = encodeURIComponent(`${getShareText()} ${shareUrl}`);
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const handleFacebookShare = () => {
    if (!shareUrl) {
      handleShare().then(() => {
        const url = `${window.location.origin}/result/${shareId}`;
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank",
        );
      });
    } else {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        "_blank",
      );
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
            <div className="mt-8 flex flex-col gap-3">
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
                    navigator.clipboard.writeText(shareUrl ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="py-2 px-3 text-center border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <svg
                      className="h-5 w-5 text-green-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </button>
              )}
              <Link
                href="/practice"
                className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50"
              >
                Practice More
              </Link>
              <button
                type="button"
                onClick={() => {
                  router.push("/quizzes?generate=weak-areas");
                }}
                className="flex-1 py-3 text-center border border-purple-500 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Quiz Weak Areas
              </button>
              {attempt?.mock && (
                <Link
                  href={`/leaderboard?mockId=${attempt.mock.id}`}
                  className="flex-1 py-3 text-center border rounded-lg hover:bg-gray-50"
                >
                  Leaderboard
                </Link>
              )}
              {shareUrl ? (
                <>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex-1 py-3 text-center border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={handleTwitterShare}
                    className="py-2 px-3 text-center border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                    aria-label="Share on X (Twitter)"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="py-2 px-3 text-center border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                    aria-label="Share on WhatsApp"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleFacebookShare}
                    className="py-2 px-3 text-center border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                    aria-label="Share on Facebook"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl ?? "")}`;
                      window.open(
                        linkedInUrl,
                        "_blank",
                        "width=600,height=400",
                      );
                    }}
                    className="py-2 px-3 text-center border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                    aria-label="Share on LinkedIn"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                </>
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

                      <PerQuestionChat
                        attemptId={attemptId}
                        questionId={result.questionId}
                        questionTitle={
                          question?.title || `Question ${index + 1}`
                        }
                        questionNumber={index + 1}
                        isOpen={openPerQuestionChats.has(result.questionId)}
                        onOpenChange={(open) => {
                          setOpenPerQuestionChats((prev) => {
                            const next = new Set(prev);
                            if (open) {
                              next.add(result.questionId);
                            } else {
                              next.delete(result.questionId);
                            }
                            return next;
                          });
                        }}
                      />
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
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg wrap-break-word overflow-x-auto">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              {result.isCorrect ? "Explanation" : "Feedback"}
                            </p>
                            {detailedResult?.feedbackMd ? (
                              <div className="prose prose-sm max-w-full wrap-break-word">
                                <ReactMarkdown>
                                  {detailedResult.feedbackMd}
                                </ReactMarkdown>
                              </div>
                            ) : result.feedbackMd ? (
                              <div className="prose prose-sm max-w-full wrap-break-word">
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
                    onClick={() =>
                      setFeedbackRating(star === feedbackRating ? 0 : star)
                    }
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
                    onClick={() =>
                      setFeedbackDifficulty(
                        level === feedbackDifficulty ? "" : level,
                      )
                    }
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
              <p className="text-sm font-medium mb-2">
                Any suggestions? (optional)
              </p>
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
            <Button variant="ghost" onClick={handleSkipFeedback}>
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
