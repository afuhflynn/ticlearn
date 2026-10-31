"use client";

import { ChevronRight, Loader2, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { MathMarkdown } from "@/components/math-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressLine } from "@/components/ui/process-progress";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useQuiz, useSubmitQuizAttempt } from "@/hooks";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import {
  clearActiveRunId,
  clearQuizSnapshot,
  getActiveRunId,
  loadQuizSnapshot,
  newQuizRunId,
  saveQuizSnapshot,
} from "@/lib/chat/quiz-snapshot";
import { cn } from "@/lib/utils";

type Phase = "setup" | "generating" | "answering" | "complete" | "error";

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
  questions: QuizQuestion[];
};

type AttemptResult = {
  attempt: {
    id: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    answers: Array<{
      id?: string;
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation?: string | null;
    }>;
  };
  pointsEarned: number;
  currentStreak: number;
};

/**
 * The letters printed on the option cards. A typed answer maps positionally:
 * A is the first option, B the second, and so on.
 */
const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Reads a letter out of free text. Accepts a bare letter, a digit, an
 * "option B" phrasing, or the full option text. Anything else is unclear.
 */
function extractLetter(raw: string, options: string[]): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/^OPTION\s+/, "");
  if (!cleaned) return null;
  const full = options.findIndex(
    (option) => option.trim().toUpperCase() === cleaned,
  );
  if (full >= 0 && full < LETTERS.length) return LETTERS[full];
  const first = cleaned[0];
  if (first >= "A" && first <= "Z") {
    const index = first.charCodeAt(0) - 65;
    return index < options.length ? LETTERS[index] : null;
  }
  const digit = Number.parseInt(first, 10);
  if (digit >= 1 && digit <= options.length) return LETTERS[digit - 1];
  return null;
}

/**
 * QuizRunner runs a whole quiz inside the chat thread. The student sets up
 * (topic, count), answers one question at a time, sees each mark as it lands,
 * and gets full correction at completion. Runs are untimed in v1. Nothing is
 * stored in the database until the student submits; answers live in chat
 * state until then.
 */
export function QuizRunner({
  conversationId,
  noteId,
  noteTitle,
}: {
  conversationId: string;
  noteId: string | null;
  noteTitle: string | null;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  /**
   * Reload rebuild reads the browser snapshot for this conversation. The
   * active pointer finds the run, the snapshot holds quiz id plus answers
   * plus marks plus position. A missing quiz row drops the snapshot later
   * with a plain message, so the student never sits on a dead run.
   */
  const [clientRunId, setClientRunId] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.clientRunId;
    }
    return newQuizRunId();
  });

  const [phase, setPhase] = useState<Phase>(() => {
    const active = getActiveRunId(conversationId);
    if (active && loadQuizSnapshot(conversationId, active)) {
      return "generating";
    }
    return "setup";
  });
  const [count, setCount] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.count;
    }
    return 5;
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.currentIndex;
    }
    return 0;
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.answers;
    }
    return {};
  });
  const [marks, setMarks] = useState<
    Record<string, { isCorrect: boolean; why: string }>
  >(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.marks;
    }
    return {};
  });
  const [quizId, setQuizId] = useState<string | null>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.quizId;
    }
    return null;
  });
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grading, setGrading] = useState<string | null>(null);
  const [typedLetter, setTypedLetter] = useState("");
  const [unclearNotice, setUnclearNotice] = useState<string | null>(null);
  const [reprompted, setReprompted] = useState<Record<string, boolean>>({});
  const letterInputId = useId();

  const submitAttempt = useSubmitQuizAttempt();
  const { data: quizData, isError: quizError } = useQuiz(quizId ?? "");

  useEffect(() => {
    if (quizData?.quiz && quizData.quiz.status === "READY") {
      setQuiz(quizData.quiz as QuizResponse);
      setPhase("answering");
      setError(null);
    }
    if (quizData?.quiz && quizData.quiz.status === "ERROR") {
      setPhase("error");
      setError("Quiz generation failed. Try again.");
    }
    if (quizError && quizId) {
      clearQuizSnapshot(conversationId, clientRunId);
      clearActiveRunId(conversationId);
      setQuizId(null);
      setPhase("setup");
      setError("That quiz is no longer around. Start a fresh one.");
    }
  }, [quizData, quizError, quizId, conversationId, clientRunId]);

  useEffect(() => {
    if (phase !== "answering" || !quizId) return;
    saveQuizSnapshot(conversationId, {
      version: 1,
      quizId,
      answers,
      marks,
      currentIndex,
      count,
      clientRunId,
      updatedAt: Date.now(),
    });
  }, [
    phase,
    quizId,
    answers,
    marks,
    currentIndex,
    count,
    clientRunId,
    conversationId,
  ]);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const correctCount = Object.values(marks).filter((m) => m.isCorrect).length;
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0;

  // Two or more questions citing note figures means the run leans on
  // diagrams, and the full quiz page fits better than this thread.
  const visualCount = useMemo(
    () =>
      questions.filter((question) => (question.sourcePages?.length ?? 0) > 0)
        .length,
    [questions],
  );
  const showHandoff = visualCount >= 2;

  const handleStart = useCallback(async () => {
    if (!noteId) {
      setError("No note to quiz on yet. Upload a note first.");
      return;
    }
    const previous = getActiveRunId(conversationId);
    if (previous) clearQuizSnapshot(conversationId, previous);
    const runId = newQuizRunId();
    setClientRunId(runId);
    setQuizId(null);
    setQuiz(null);
    setAnswers({});
    setMarks({});
    setCurrentIndex(0);
    setResult(null);
    setReprompted({});
    setPhase("generating");
    setError(null);
    try {
      const result = await api.mutations.quizzes.generate({
        noteId,
        questionCount: count,
        questionTypes: "MIXED",
        timed: false,
        source: "chat",
        conversationId,
      });
      setQuizId(result.quiz.id);
    } catch (err) {
      setPhase("setup");
      setError(
        err instanceof Error ? err.message : "Failed to start the quiz.",
      );
    }
  }, [noteId, count, conversationId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const clearAttemptState = useCallback(() => {
    setTypedLetter("");
    setUnclearNotice(null);
  }, []);

  /**
   * MCQ answers are marked in the client from the passed in answer, never
   * from state, so a tap marks at once instead of reading a stale value.
   * A best guess read out of free text is stated aloud before the score.
   */
  const markMCQAnswer = (
    question: QuizQuestion,
    userAnswer: string,
    announced?: string,
  ) => {
    const isCorrect = userAnswer.trim() === question.correctAnswer.trim();
    const prefix = announced ? `${announced} ` : "";
    const why = isCorrect
      ? `${prefix}That's correct.`
      : `${prefix}Not quite — the correct answer is ${question.correctAnswer}.`;
    setMarks((current) => ({
      ...current,
      [question.id]: { isCorrect, why },
    }));
  };

  const handleLetterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentQuestion || currentQuestion.type !== "MCQ") return;
    if (marks[currentQuestion.id]) return;
    const letter = extractLetter(typedLetter, currentQuestion.options);
    if (!letter) {
      // Unclear input waits on a real pick. The copy stays fixed, nothing is
      // marked, and nothing is skipped.
      if (!reprompted[currentQuestion.id]) {
        setReprompted((current) => ({
          ...current,
          [currentQuestion.id]: true,
        }));
      }
      setUnclearNotice("Tap an option or type its letter, for example B.");
      return;
    }
    const option = currentQuestion.options[LETTERS.indexOf(letter)];
    const exact = typedLetter.trim().toUpperCase() === letter;
    handleAnswerChange(currentQuestion.id, option);
    markMCQAnswer(
      currentQuestion,
      option,
      exact ? undefined : `Reading that as ${letter}.`,
    );
    setTypedLetter("");
    setUnclearNotice(null);
  };

  const handleMarkOpenAnswer = useCallback(async () => {
    if (!currentQuestion || !userId || currentQuestion.type !== "OPEN") return;
    const userAnswer = answers[currentQuestion.id] ?? "";
    if (!userAnswer.trim()) {
      setUnclearNotice(
        "Say a little more, even a rough try in your own words. Then mark it again.",
      );
      return;
    }
    if (userAnswer.trim().length < 2 && !reprompted[currentQuestion.id]) {
      setReprompted((current) => ({
        ...current,
        [currentQuestion.id]: true,
      }));
      setUnclearNotice(
        "Say a little more, even a rough try in your own words. Then mark it again.",
      );
      return;
    }

    setUnclearNotice(null);
    setGrading(currentQuestion.id);

    // Open answers are graded by the model, same task and cost as the page.
    try {
      const graded = await api.mutations.quizzes.grade({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        type: currentQuestion.type,
        userAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        options: currentQuestion.options,
      });
      setMarks((current) => ({
        ...current,
        [currentQuestion.id]: {
          isCorrect: graded.isCorrect,
          why: graded.why,
        },
      }));
    } catch {
      setMarks((current) => ({
        ...current,
        [currentQuestion.id]: {
          isCorrect: false,
          why: "Could not mark that answer just now. Try again.",
        },
      }));
    } finally {
      setGrading(null);
    }
  }, [currentQuestion, answers, userId, reprompted]);

  const handleNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
    setGrading(null);
    clearAttemptState();
  }, [questions.length, clearAttemptState]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const answersArray = questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? "",
      }));

      const submission = await submitAttempt.mutateAsync({
        quizId: quizId!,
        answers: answersArray,
        source: "chat",
        conversationId,
        clientRunId,
      });

      setResult(submission as AttemptResult);
      setPhase("complete");
      clearQuizSnapshot(conversationId, clientRunId);
      clearActiveRunId(conversationId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit the quiz.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions, quizId, submitAttempt, conversationId, clientRunId]);

  const handleRetake = () => {
    clearQuizSnapshot(conversationId, clientRunId);
    const runId = newQuizRunId();
    setClientRunId(runId);
    setAnswers({});
    setMarks({});
    setCurrentIndex(0);
    setResult(null);
    setError(null);
    setTypedLetter("");
    setUnclearNotice(null);
    setReprompted({});
    setPhase("answering");
  };

  const handleClose = () => {
    clearQuizSnapshot(conversationId, clientRunId);
    clearActiveRunId(conversationId);
    // Signalled to the parent to unmount the runner.
    // Unmount alone never clears, so a reload keeps the snapshot.
    window.dispatchEvent(
      new CustomEvent("ticlearn:quiz-close", { bubbles: true }),
    );
  };

  if (session === null || phase === "setup") {
    return (
      <div className="mx-auto w-full max-w-[48rem] space-y-6 px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Set up your quiz</CardTitle>
            <CardDescription>
              Practice on <strong>{noteTitle ?? "this note"}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Topic
              </label>
              <p className="text-sm text-foreground">
                {noteTitle ?? "No note attached to this conversation."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Questions
              </label>
              <div className="flex flex-wrap gap-2">
                {[5, 10].map((n) => (
                  <Button
                    key={n}
                    variant={count === n ? "default" : "outline"}
                    onClick={() => setCount(n)}
                    size="sm"
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant={count !== 5 && count !== 10 ? "default" : "outline"}
                  onClick={() => {
                    const next = window.prompt(
                      "How many questions? (1-10)",
                      "5",
                    );
                    const parsed = next ? Number(next) : null;
                    if (parsed && parsed >= 1 && parsed <= 10) setCount(parsed);
                  }}
                  size="sm"
                >
                  Custom
                </Button>
              </div>
              {count < 1 || count > 10 ? (
                <p className="text-xs text-muted-foreground">
                  Pick 1 to 10 questions.
                </p>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Runs are untimed. No clock, no cutoff.
            </p>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              <Button
                onClick={handleStart}
                disabled={!noteId || count < 1 || count > 10}
                className="w-full sm:w-auto"
              >
                Start quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="w-full border-destructive/50 bg-destructive/10">
            <CardContent className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
            <p className="font-medium">Your quiz is being written.</p>
            <ProgressLine
              message="Tip is building your questions."
              estimate="It usually takes about a minute."
            />
            <p className="break-words text-sm text-muted-foreground">
              This thread refreshes until the quiz is ready.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <Card className="w-full border-destructive/50 bg-destructive/10">
          <CardContent className="space-y-4 pt-6">
            <p className="font-medium text-destructive">Quiz not available.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Back to chat
              </Button>
              <Button onClick={() => setPhase("setup")}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
            <p className="font-medium">Unable to load question.</p>
            <Button variant="outline" onClick={handleClose}>
              Back to chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "answering") {
    const mark = marks[currentQuestion.id];
    const isMCQ = currentQuestion.type === "MCQ";
    const selected = answers[currentQuestion.id];

    return (
      <div className="mx-auto w-full max-w-[48rem] space-y-6 px-4">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="max-w-full truncate">
                {noteTitle ?? "Quiz"}
              </Badge>
              <Badge variant="secondary">{currentQuestion.type}</Badge>
            </div>
            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
              Quiz
            </h1>
            <p className="break-words text-sm text-muted-foreground sm:text-base">
              Question {currentIndex + 1} of {questions.length} • {correctCount}{" "}
              correct
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Button variant="outline" onClick={handleClose}>
              Back to chat
            </Button>
          </div>
        </div>

        <Progress value={progress} />

        {showHandoff && quizId ? (
          <Card className="w-full border-primary/40 bg-primary/5">
            <CardContent className="space-y-2 pt-6">
              <p className="font-medium">Better on the full quiz page</p>
              <p className="text-sm text-muted-foreground">
                This quiz leans on diagrams. The full page lays each figure
                beside its question, which this thread cannot do. Open it for
                careful review or printing.
              </p>
              <Button variant="outline" asChild size="sm">
                <Link href={`/quizzes/${quizId}`}>Open full quiz page</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="w-full">
          <CardHeader className="space-y-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <CardTitle className="min-w-0 text-lg sm:text-xl">
                Question {currentIndex + 1}
              </CardTitle>
              {currentQuestion.sourcePages &&
              currentQuestion.sourcePages.length > 0 ? (
                <Badge variant="secondary">
                  {currentQuestion.sourcePages.length === 1
                    ? `Page ${currentQuestion.sourcePages[0]}`
                    : `Pages ${currentQuestion.sourcePages.join(", ")}`}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="break-words text-base text-foreground">
              <MathMarkdown content={currentQuestion.question} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMCQ ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const selectedOption = selected === option;
                  const letter = LETTERS[index] ?? String(index + 1);
                  return (
                    <Button
                      key={option}
                      variant={
                        mark
                          ? selectedOption === mark.isCorrect
                            ? "default"
                            : "outline"
                          : selectedOption
                            ? "default"
                            : "outline"
                      }
                      className={`h-auto w-full justify-start whitespace-normal p-4 text-left ${
                        mark
                          ? selectedOption === mark.isCorrect
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-destructive bg-destructive/10 text-destructive"
                          : selectedOption
                            ? "border-primary"
                            : ""
                      }`}
                      disabled={!!mark}
                      onClick={() => {
                        if (mark) return;
                        handleAnswerChange(currentQuestion.id, option);
                        markMCQAnswer(currentQuestion, option);
                      }}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
                        {letter}
                      </span>
                      <span className="min-w-0 break-words text-left">
                        <MathMarkdown content={option} />
                      </span>
                    </Button>
                  );
                })}
                {mark ? null : (
                  <form className="flex gap-2" onSubmit={handleLetterSubmit}>
                    <label className="sr-only" htmlFor={letterInputId}>
                      Type a letter instead, for example B
                    </label>
                    <Input
                      className="min-h-11"
                      id={letterInputId}
                      maxLength={60}
                      onChange={(event) => setTypedLetter(event.target.value)}
                      placeholder="Or type a letter, for example B"
                      value={typedLetter}
                    />
                    <Button
                      className="shrink-0"
                      disabled={!typedLetter.trim()}
                      type="submit"
                      variant="outline"
                    >
                      Answer
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <Textarea
                  rows={8}
                  className="min-h-40 resize-y"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] ?? ""}
                  onChange={(event) =>
                    handleAnswerChange(currentQuestion.id, event.target.value)
                  }
                />
                {mark ? null : (
                  <Button
                    onClick={() => void handleMarkOpenAnswer()}
                    disabled={grading === currentQuestion.id}
                    className="w-full sm:w-auto"
                  >
                    Mark answer
                  </Button>
                )}
              </>
            )}

            {unclearNotice && !mark ? (
              <p className="text-sm text-muted-foreground">{unclearNotice}</p>
            ) : null}

            {mark && (
              <div
                className={cn(
                  "rounded-lg border p-3 mt-2",
                  mark.isCorrect
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                <p className="text-sm font-medium">
                  {mark.isCorrect ? "Correct" : "Incorrect"}
                </p>
                <p className="text-sm break-words">{mark.why}</p>
              </div>
            )}

            {grading === currentQuestion.id && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Marking...
              </div>
            )}

            {!mark && !grading && currentIndex < questions.length - 1 ? (
              <p className="text-xs text-muted-foreground">
                Answer the question, then move to the next one.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentIndex((index) => Math.max(index - 1, 0));
              clearAttemptState();
            }}
            disabled={currentIndex === 0 || !!mark}
            className="w-full sm:w-auto"
          >
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
            Previous
          </Button>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-3">
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!mark}
                className="w-full sm:w-auto"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !mark}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Finish Quiz"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // phase === "complete"
  return (
    <div className="mx-auto w-full max-w-[48rem] space-y-6 px-4">
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
              <p className="text-2xl font-bold">{result?.attempt.score}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Correct</p>
              <p className="text-2xl font-bold">
                {result?.attempt.correctAnswers}/
                {result?.attempt.totalQuestions}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Points earned</p>
              <p className="text-2xl font-bold">{result?.pointsEarned}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Source</p>
              <p className="text-2xl font-bold">Chat</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="w-full" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full">
              Back to chat
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const answer = result?.attempt.answers.find(
            (entry) => entry.questionId === question.id,
          );
          const mark = marks[question.id];

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
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-destructive bg-destructive/10 text-destructive"
                    }`}
                  >
                    <div
                      className={`break-words text-sm ${
                        answer?.isCorrect ? "text-primary" : "text-destructive"
                      }`}
                    >
                      <MathMarkdown
                        content={answer?.userAnswer || "No answer submitted"}
                      />
                    </div>
                  </div>
                </div>
                {!answer?.isCorrect && (
                  <div>
                    <p className="mb-1 text-sm font-medium">Correct answer</p>
                    <div className="rounded-lg border border-primary bg-primary/10 p-3">
                      <div className="break-words text-sm text-primary">
                        <MathMarkdown content={answer?.correctAnswer || ""} />
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
