"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  usePaper3Mock,
  useStartPaper3MockExam,
  useSubmitPaper3MockExam,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { Paper3ContentRenderer } from "@/components/paper3/Paper3ContentRenderer";
import { TiCExamAssistant } from "@/components/paper3/TiCExamAssistant";
import { Badge } from "@/components/ui/badge";

export default function TakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId as string;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const { data: mockData, isLoading } = usePaper3Mock(mockId);
  const startExam = useStartPaper3MockExam();
  const submitExam = useSubmitPaper3MockExam();

  const mock = mockData?.mock;
  const questions = mock?.questions ?? [];

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

  const handleStart = async () => {
    try {
      const res = await startExam.mutateAsync({ mockId });
      setAttemptId(res.attempt.id);
      setStarted(true);
      if (res.resumed) {
        // Restore previous answers if resuming
        if (res.attempt.answers) {
          setAnswers(res.attempt.answers as Record<string, string>);
        }
        // Restore time if available
        if (res.attempt.timeTaken && mock?.timeLimit) {
          setTimeLeft(mock.timeLimit * 60 - res.attempt.timeTaken);
        }
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
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
            placeholder="Your code here..."
            className="w-full p-3 border rounded-lg font-mono min-h-[150px]"
            rows={6}
          />
        );
      case "ALGORITHM_PSEUDOCODE":
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
            placeholder="Write your algorithm in pseudocode..."
            className="w-full p-3 border rounded-lg font-mono min-h-[120px]"
            rows={4}
          />
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

  if (!started) {
    return (
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
          </div>
          <button
            type="button"
            onClick={handleStart}
            disabled={startExam.isPending}
            className="w-full mt-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {startExam.isPending ? "Starting..." : "Start Exam"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-4">
            Once started, the timer will begin. Make sure you have a stable
            internet connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {started && attemptId && (
        <TiCExamAssistant
          attemptId={attemptId}
          questionId={questions[currentIndex]?.question?.id ?? null}
        />
      )}
    </div>
  );
}
