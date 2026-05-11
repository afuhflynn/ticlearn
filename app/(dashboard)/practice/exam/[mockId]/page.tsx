"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  usePaper3Mock,
  useStartPaper3MockExam,
  useSubmitPaper3MockExam,
  usePaper3MyAttempts,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { Paper3ContentRenderer } from "@/components/paper3/Paper3ContentRenderer";
import { HtmlPreview } from "@/components/paper3/HtmlPreview";
import { Badge } from "@/components/ui/badge";
import { isHtmlQuestion } from "@/lib/paper3/evaluate";
import { usePlan } from "@/hooks/usePlan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Eye, EyeOff, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function TakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId as string;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  const { data: mockData, isLoading } = usePaper3Mock(mockId);
  const { data: attemptsData } = usePaper3MyAttempts(1, 10);
  const startExam = useStartPaper3MockExam();
  const submitExam = useSubmitPaper3MockExam();
  const { isPending } = usePlan();

  const mock = mockData?.mock;
  const questions = mock?.questions ?? [];

  const previousAttempt = attemptsData?.attempts?.find(
    (a: any) => a.mock?.id === mockId && a.status === "COMPLETED",
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = useCallback(async () => {
    if (!attemptId || !mockId) return;

    try {
      const totalTime = (mock?.timeLimit ?? 0) * 60 - timeLeft;
      await submitExam.mutateAsync({
        mockId,
        attemptId,
        answers,
        timeTaken: totalTime,
      });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push(`/practice/exam/result/${attemptId}`);
    } catch (error) {
      console.error("Failed to submit exam:", error);
    }
  }, [attemptId, mockId, answers, timeLeft, submitExam, router, mock]);

  useEffect(() => {
    if (mock?.timeLimit) {
      setTimeLeft(mock.timeLimit * 60);
    }
  }, [mock]);

  useEffect(() => {
    if (!started || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timeLeft, handleSubmit]);

  useEffect(() => {
    if (!started) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && started && !showExitWarning) {
        setShowExitWarning(true);
        setTimeout(() => {
          if (!document.fullscreenElement) {
            handleSubmit();
          }
          setShowExitWarning(false);
        }, 3000);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [started, handleSubmit, showExitWarning]);

  const handleStart = async () => {
    if (!agreedToRules) return;
    setShowRulesModal(false);
    setStarted(true);

    let fullscreenSuccess = false;
    try {
      await document.documentElement.requestFullscreen();
      fullscreenSuccess = true;
    } catch {
      console.warn("Fullscreen not available or blocked by browser");
    }

    if (!fullscreenSuccess) {
      setFullscreenError(true);
      setStarted(false);
      return;
    }

    try {
      const res = await startExam.mutateAsync({ mockId });
      setAttemptId(res.attempt.id);
      if (res.resumed && res.attempt.answers) {
        setAnswers(res.attempt.answers as Record<string, string>);
        if (res.attempt.timeTaken && mock?.timeLimit) {
          setTimeLeft(mock.timeLimit * 60 - res.attempt.timeTaken);
        }
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
      setStarted(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const getTaskTypeInput = (taskType: string) => {
    switch (taskType) {
      case "EXCEL_FORMULA":
      case "EXCEL_GRID":
      case "SPREADSHEET_FORMULA":
        return (
          <input
            id="answer"
            type="text"
            value={answers[currentQuestion?.question?.id] ?? ""}
            onChange={(e) =>
              setAnswers({
                ...answers,
                [currentQuestion.question.id]: e.target.value,
              })
            }
            placeholder="Enter formula (e.g., =SUM(A1:A10))"
            className="w-full p-3 border rounded-lg font-mono"
          />
        );
      case "SQL_QUERY":
      case "ACCESS_TABLE":
      case "ACCESS_RELATIONSHIP":
        return (
          <textarea
            id="answer"
            value={answers[currentQuestion?.question?.id] ?? ""}
            onChange={(e) =>
              setAnswers({
                ...answers,
                [currentQuestion.question.id]: e.target.value,
              })
            }
            placeholder="SELECT ..."
            className="w-full p-3 border rounded-lg font-mono min-h-[120px]"
            rows={4}
          />
        );
      case "C_PROGRAM":
      case "PASCAL_PROGRAM":
      case "WEB_PROGRAMMING":
      case "CODE_EDITOR":
      case "ALGORITHM_PSEUDOCODE":
        return (
          <div className="space-y-2">
            {isHtmlQuestion(
              currentQuestion.question?.taskType,
              currentQuestion.question?.contentMd,
            ) && (
              <HtmlPreview
                html={answers[currentQuestion.question?.id] ?? ""}
                height="200px"
                className="mb-2"
              />
            )}
            <textarea
              id="answer"
              value={answers[currentQuestion?.question?.id] ?? ""}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [currentQuestion.question.id]: e.target.value,
                })
              }
              placeholder={
                currentQuestion.question?.taskType === "WEB_PROGRAMMING"
                  ? "Enter your HTML code here..."
                  : currentQuestion.question?.taskType ===
                      "ALGORITHM_PSEUDOCODE"
                    ? "Write your algorithm in pseudocode..."
                    : "Your code here..."
              }
              className="w-full p-3 border rounded-lg font-mono min-h-[150px]"
              rows={6}
            />
          </div>
        );
      default:
        return (
          <textarea
            id="answer"
            value={answers[currentQuestion?.question?.id] ?? ""}
            onChange={(e) =>
              setAnswers({
                ...answers,
                [currentQuestion.question.id]: e.target.value,
              })
            }
            placeholder="Your answer here..."
            className="w-full p-3 border rounded-lg font-mono min-h-15 "
          />
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

  if (fullscreenError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Fullscreen Required</h2>
          <p className="text-gray-600 mb-4">
            This exam requires fullscreen mode to start. Please allow fullscreen
            access and try again.
          </p>
          <Button
            onClick={() => {
              setFullscreenError(false);
              setShowRulesModal(true);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <>
        <div className="h-full flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-xl md:text-2xl font-bold">{mock?.title}</h1>
            <p className="text-gray-600 mt-2">{mock?.description}</p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Questions</span>
                <span className="font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Marks</span>
                <span className="font-medium">{mock?.totalMarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time Limit</span>
                <span className="font-medium">{mock?.timeLimit} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subject</span>
                <span className="font-medium">{mock?.subject}</span>
              </div>
              {previousAttempt && (
                <div className="flex justify-between bg-yellow-50 p-2 rounded">
                  <span className="text-yellow-700">Previous Score</span>
                  <span className="font-medium text-yellow-700">
                    {previousAttempt.score}%
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-3">
              <Button
                onClick={() => setShowRulesModal(true)}
                className="w-full"
              >
                Start Exam
              </Button>
              {previousAttempt && (
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/practice/exam/result/${previousAttempt.id}`)
                  }
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Previous Result
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              Exam will be in fullscreen mode. Exiting fullscreen submits your
              exam.
            </p>
          </div>
        </div>

        <Dialog open={showRulesModal} onOpenChange={setShowRulesModal}>
          <DialogContent className="max-w-lg md:min-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Exam Rules & Instructions</DialogTitle>
              <DialogDescription>
                Please read and agree to the following rules before starting
                your exam.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Fullscreen Mode Required
                </h3>
                <p className="text-sm text-blue-700">
                  This exam runs in fullscreen mode. The exam will automatically
                  submit if you exit fullscreen mode.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Exam Rules</h3>
                <ul className="list-disc pl-5 text-sm space-y-2 text-gray-600">
                  <li>The timer starts immediately when you begin.</li>
                  <li>
                    Exiting fullscreen mode will automatically submit your exam.
                  </li>
                  <li>
                    Switching tabs or minimizing the window will trigger a
                    warning.
                  </li>
                  <li>
                    Your answers are saved as you progress through questions.
                  </li>
                  <li>
                    You can navigate between questions using the Previous/Next
                    buttons.
                  </li>
                  <li>You can retake this exam with a Premium subscription.</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Important
                </h3>
                <p className="text-sm text-yellow-700">
                  Once you exit fullscreen, your exam cannot be paused or
                  resumed. Make sure you have a stable internet connection
                  before starting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t">
              <input
                type="checkbox"
                id="agree-rules"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="agree-rules" className="text-sm">
                I understand and agree to the exam rules above.
              </label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRulesModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={!agreedToRules || startExam.isPending}
              >
                {startExam.isPending ? "Starting..." : "Start Exam"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dialog open={showExitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warning: Exam Will Submit
            </DialogTitle>
            <DialogDescription>
              You have exited fullscreen mode. Your exam will be automatically
              submitted in 3 seconds. Please return to fullscreen mode to
              continue.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="container mx-auto max-w-3xl flex justify-between items-center">
          <div>
            <h1 className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-none">
              {mock?.title}
            </h1>
            <p className="text-xs text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div
            className={`text-lg font-mono font-bold ${
              timeLeft < 300 ? "text-red-600" : ""
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="mt-2 h-1 bg-gray-200">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl p-4">
        {currentQuestion && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <Badge className="text-xs h-6 w-6 rounded-full text-center font-semibold flex items-center justify-center mb-2">
                  {currentQuestion.question?.questionNumber}
                </Badge>
                <h2 className="text-lg font-medium">
                  {currentQuestion.question?.title}
                </h2>
              </div>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                {currentQuestion.marks} marks
              </span>
            </div>

            <div className="mb-4 w-full">
              <Paper3ContentRenderer
                contentMd={currentQuestion.question?.contentMd}
                content={currentQuestion.question?.content}
                visualElements={currentQuestion.question?.visualElements as any}
              />
            </div>

            {currentQuestion.question?.requireAnswer !== false && (
              <div className="mt-6">
                <label
                  htmlFor="answer"
                  className="block text-lg font-medium mb-2"
                >
                  Your Answer
                </label>
                {getTaskTypeInput(currentQuestion.question?.taskType)}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(questions.length - 1, prev + 1),
                  )
                }
                disabled={currentIndex === questions.length - 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between flex-col items-center">
          <div className="flex flex-wrap gap-2">
            {questions.map((q: { question?: { id: string } }, idx: number) => (
              <button
                key={q.question?.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 text-xs rounded transition-colors ${
                  idx === currentIndex
                    ? "bg-primary text-white"
                    : answers[q.question?.id ?? ""]
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitExam.isPending}
            className="px-6 py-4 w-full mt-4"
          >
            {submitExam.isPending ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </div>

      </div>
  );
}
