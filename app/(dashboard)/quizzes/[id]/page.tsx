"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuizArt } from "@/components/art/quiz-art";
import { MathMarkdown } from "@/components/math-markdown";
import { RetryPanel } from "@/components/retries/retry-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLongWait } from "@/components/ui/pending-region";
import { ProgressLine } from "@/components/ui/process-progress";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useQuiz, useQuizAttempts, useSubmitQuizAttempt } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { QuizRunnerSkeleton } from "../../student-skeletons";

type QuizQuestion = {
  id: string;
  type: "MCQ" | "OPEN";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  order: number;
  sourcePages?: number[];
};

type QuizResponse = {
  id: string;
  title: string;
  noteTitle: string;
  status: "GENERATING" | "READY" | "ERROR";
  timed: boolean;
  timeLimit: number | null;
  isPublic: boolean;
  questions: QuizQuestion[];
};

type AttemptAnswer = {
  id?: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string | null;
};

type AttemptResult = {
  attempt: {
    id: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    answers: AttemptAnswer[];
  };
  pointsEarned: number;
  currentStreak: number;
};

/**
 * A quiz is one model call, so the honest indicator is a plain line with a
 * time estimate and not a stage list. The line only appears once the wait
 * passes ten seconds, measured on the client's own clock.
 */
function QuizGeneratingLine() {
  const isLongWait = useLongWait(true);
  if (!isLongWait) return null;
  return (
    <ProgressLine
      message="Your quiz is still being written."
      estimate="It usually takes about a minute."
    />
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function QuizPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = params.id;
  const { data: session, isPending: sessionPending } = useSession();
  const { data, isLoading, error } = useQuiz(quizId);
  const { data: attemptsData } = useQuizAttempts(quizId);
  const submitAttempt = useSubmitQuizAttempt();

  const quiz = data?.quiz as QuizResponse | undefined;
  const quizNoteId =
    (data?.quiz as unknown as { note?: { id?: string } | null })?.note?.id ??
    (data?.quiz as unknown as { noteId?: string | null })?.noteId ??
    null;
  const questions = quiz?.questions ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showPreviousAttempt, setShowPreviousAttempt] = useState(true);

  const previousAttempt = attemptsData?.attempts?.[0] as
    | {
        id: string;
        score: number;
        totalQuestions: number;
        correctAnswers: number;
        completedAt: string | null;
      }
    | undefined;

  const currentQuestion = questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push("/sign-in");
    }
  }, [router, session, sessionPending]);

  useEffect(() => {
    if (!quiz) return;

    if (quiz.timed && quiz.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60);
    } else {
      setTimeRemaining(null);
    }
  }, [quiz?.id, quiz?.timed, quiz?.timeLimit, quiz]);

  useEffect(() => {
    if (
      !quiz?.timed ||
      timeRemaining === null ||
      result ||
      submitAttempt.isPending
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current === null) return null;
        return current > 0 ? current - 1 : 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quiz?.timed, timeRemaining, result, submitAttempt.isPending]);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;

    const answersArray = questions.map((question) => ({
      questionId: question.id,
      answer: answers[question.id] ?? "",
    }));

    const submission = await submitAttempt.mutateAsync({
      quizId: quiz.id,
      answers: answersArray,
    });

    setResult(submission as AttemptResult);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [answers, questions, quiz, submitAttempt]);

  useEffect(() => {
    if (
      !quiz?.timed ||
      timeRemaining !== 0 ||
      result ||
      submitAttempt.isPending
    ) {
      return;
    }

    void handleSubmit();
  }, [
    timeRemaining,
    quiz?.timed,
    result,
    submitAttempt.isPending,
    handleSubmit,
  ]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setShowPreviousAttempt(false);
    if (quiz?.timed && quiz.timeLimit) {
      setTimeRemaining(quiz.timeLimit * 60);
    }
  };

  if (sessionPending || isLoading) {
    return <QuizRunnerSkeleton />;
  }

  if (error || !quiz) {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <p className="font-medium">Quiz not available.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/quizzes">Back to quizzes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (quiz.status === "GENERATING") {
    return (
      <Card className="w-full">
        <CardContent className="space-y-2 pt-6">
          <p className="font-medium">Quiz generation is still running</p>
          <QuizGeneratingLine />
          <p className="break-words text-sm text-muted-foreground">
            This page refreshes automatically until the quiz is ready.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (quiz.status === "ERROR") {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <p className="font-medium">Quiz generation failed.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/upload">Back to notes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <p className="font-medium">This quiz has no questions.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/quizzes">Back to quizzes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <p className="font-medium">Unable to load question.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/quizzes">Back to quizzes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 overflow-x-hidden px-4 sm:px-6 lg:px-8 h-full">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="max-w-full truncate">
              {quiz.noteTitle}
            </Badge>
            {quiz.isPublic ? (
              <Badge>Public</Badge>
            ) : (
              <Badge variant="secondary">Private</Badge>
            )}
            {quiz.timed ? <Badge variant="secondary">Timed</Badge> : null}
          </div>
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
            {quiz.title.replaceAll("_", " ")}
          </h1>
          <p className="break-words text-sm text-muted-foreground sm:text-base">
            {questions.length} question{questions.length === 1 ? "" : "s"} •{" "}
            {answeredCount} answered
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          {quiz.timed && timeRemaining !== null ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 md:w-auto md:justify-start">
              <Clock3 className="h-4 w-4 shrink-0" />
              <span className="font-medium tabular-nums">
                {formatTime(timeRemaining)}
              </span>
            </div>
          ) : null}
          <Button variant="outline" asChild className="w-full md:w-auto">
            <Link href="/quizzes">Back to quizzes</Link>
          </Button>
        </div>
      </div>

      {showPreviousAttempt && previousAttempt && !result ? (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="space-y-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              Previous Attempt
              <Badge variant="outline">Review</Badge>
            </CardTitle>
            <CardDescription className="break-words">
              You have previously taken this quiz. Review your results below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{previousAttempt.score}%</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-2xl font-bold">
                  {previousAttempt.correctAnswers}/
                  {previousAttempt.totalQuestions}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4 sm:col-span-2 lg:col-span-1">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="break-words text-sm font-medium">
                  {previousAttempt.completedAt
                    ? new Date(previousAttempt.completedAt).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="w-full"
                onClick={() => router.push(`/attempts/${previousAttempt.id}`)}
              >
                View Details
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPreviousAttempt(false)}
              >
                Take Quiz Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Quiz Results</CardTitle>
              <CardDescription>
                Review your performance and question-by-question feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{result.attempt.score}%</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-2xl font-bold">
                    {result.attempt.correctAnswers}/
                    {result.attempt.totalQuestions}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Points earned</p>
                  <p className="text-2xl font-bold">{result.pointsEarned}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Current streak
                  </p>
                  <p className="text-2xl font-bold">{result.currentStreak}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="w-full" onClick={handleRetake}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake Quiz
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/quizzes">Back to quizzes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = result.attempt.answers.find(
                (entry) => entry.questionId === question.id,
              );

              return (
                <Card key={question.id} className="w-full">
                  <CardHeader className="space-y-3">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <CardTitle className="min-w-0 text-lg">
                          Question {index + 1}
                        </CardTitle>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {question.type}
                        </Badge>
                      </div>
                      <Badge
                        variant={answer?.isCorrect ? "default" : "destructive"}
                        className="shrink-0"
                      >
                        {answer?.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                    <CardDescription className="break-words text-foreground">
                      <MathMarkdown content={question.question} />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-1 text-sm font-medium">Your answer</p>
                      <div
                        className={`rounded-lg border p-3 ${
                          answer?.isCorrect
                            ? "border-green-200 bg-green-50 dark:bg-green-950"
                            : "border-red-200 bg-red-50 dark:bg-red-950"
                        }`}
                      >
                        <div
                          className={`break-words text-sm ${
                            answer?.isCorrect
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          }`}
                        >
                          <MathMarkdown
                            content={
                              answer?.userAnswer || "No answer submitted"
                            }
                          />
                        </div>
                      </div>
                    </div>
                    {!answer?.isCorrect && (
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Correct answer
                        </p>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950">
                          <div className="break-words text-sm text-green-700 dark:text-green-300">
                            <MathMarkdown
                              content={answer?.correctAnswer || ""}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {question.type === "MCQ" && answer?.isCorrect && (
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Correct answer
                        </p>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950">
                          <div className="break-words text-sm text-green-700 dark:text-green-300">
                            <MathMarkdown
                              content={answer?.correctAnswer || ""}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-1 text-sm font-medium">Explanation</p>
                      <div className="overflow-x-auto rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        <MathMarkdown
                          content={
                            answer?.explanation || "No explanation available."
                          }
                        />
                      </div>
                    </div>
                    <QuizArt
                      noteId={quizNoteId}
                      sourcePages={question.sourcePages}
                      answerId={answer?.id}
                      concept={question.question.slice(0, 80)}
                    />
                    {!answer?.isCorrect && answer?.id ? (
                      <RetryPanel answerId={answer.id} showArt={false} />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="w-full">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {answeredCount}/{questions.length} answered
                </p>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader className="space-y-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <CardTitle className="min-w-0 text-lg sm:text-xl">
                  Question {currentIndex + 1}
                </CardTitle>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">{currentQuestion.type}</Badge>
                  {currentQuestion.sourcePages &&
                  currentQuestion.sourcePages.length > 0 ? (
                    <Badge variant="secondary">
                      {currentQuestion.sourcePages.length === 1
                        ? `Page ${currentQuestion.sourcePages[0]}`
                        : `Pages ${currentQuestion.sourcePages.join(", ")}`}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <CardDescription className="break-words text-base text-foreground">
                <MathMarkdown content={currentQuestion.question} />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.type === "MCQ" ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.id] === option;

                    return (
                      <Button
                        key={option}
                        variant={selected ? "default" : "outline"}
                        className={`h-auto w-full justify-start whitespace-normal p-4 text-left ${
                          selected ? "border-primary" : ""
                        }`}
                        onClick={() =>
                          handleAnswerChange(currentQuestion.id, option)
                        }
                        disabled={selected}
                      >
                        <span className="min-w-0 break-words text-left">
                          <MathMarkdown content={option} />
                        </span>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  rows={8}
                  className="min-h-40 resize-y"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(event) =>
                    handleAnswerChange(currentQuestion.id, event.target.value)
                  }
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
              disabled={currentIndex === 0}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-3">
              {currentIndex < questions.length - 1 ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setCurrentIndex((index) =>
                      Math.min(index + 1, questions.length - 1),
                    )
                  }
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => void handleSubmit()}
                  disabled={submitAttempt.isPending}
                >
                  {submitAttempt.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Quiz"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
