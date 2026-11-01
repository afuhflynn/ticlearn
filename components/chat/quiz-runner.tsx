"use client";

import { ChevronRight, Loader2, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  clearActiveRunId,
  clearQuizSnapshot,
  getActiveRunId,
  loadQuizSnapshot,
  newQuizRunId,
  type QuizMark,
  type QuizRunnerMode,
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
  marks?: number;
  markSchemeMd?: string | null;
  examinerNote?: string | null;
};

type QuizResponse = {
  id: string;
  title: string;
  noteTitle: string;
  status: "GENERATING" | "READY" | "ERROR";
  metadata?: { hints?: Record<string, string> } | null;
  questions: QuizQuestion[];
};

type AttemptResult = {
  attempt: {
    id: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    totalMarks?: number;
    marksEarned?: number;
    answers: Array<{
      id?: string;
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation?: string | null;
      marksEarned?: number;
      marksTotal?: number;
      markSchemeMd?: string | null;
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
  initialQuizId,
}: {
  conversationId: string;
  noteId: string | null;
  noteTitle: string | null;
  initialQuizId?: string | null;
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
    if (initialQuizId) {
      return "generating";
    }
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
  const [marks, setMarks] = useState<Record<string, QuizMark>>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.marks;
    }
    return {};
  });
  const [quizId, setQuizId] = useState<string | null>(() => {
    if (initialQuizId) return initialQuizId;
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.quizId) return saved.quizId;
      if (saved?.wizardDone && saved.quizId) return saved.quizId;
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
  const [mode, setMode] = useState<QuizRunnerMode>(() => {
    const active =
      typeof window === "undefined" ? null : getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.mode) return saved.mode;
    }
    return "quiz";
  });
  const [retrying, setRetrying] = useState(false);
  const [handoff, setHandoff] = useState<{
    noteId: string | null;
    noteTitle: string | null;
    topicText: string | null;
    retryWithCount: number | null;
    formatChoice: string | null;
  } | null>(() => {
    const active =
      typeof window === "undefined" ? null : getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.handoff) return saved.handoff;
    }
    return null;
  });
  const [hintOpen, setHintOpen] = useState<Record<string, boolean>>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.hintOpen ?? {};
    }
    return {};
  });
  const [minimized, setMinimized] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.minimized ?? false;
    }
    return false;
  });
  const [gradeFailed, setGradeFailed] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);
  const letterInputId = useId();

  const submitAttempt = useSubmitQuizAttempt();
  const { data: quizData, isError: quizError } = useQuiz(quizId ?? "");

  useEffect(() => {
    if (initialQuizId && initialQuizId !== quizId) {
      setQuizId(initialQuizId);
      setPhase("generating");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuizId]);

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
      mode,
      hintOpen,
      minimized,
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
    mode,
    hintOpen,
    minimized,
  ]);

  /**
   * The dock slot lives above the composer. The active run portals there so
   * the card pins low; a stale run stays inline where its message sits.
   * The active pointer is read fresh every render so two runs never dock
   * into the same slot at once.
   */
  useEffect(() => {
    setDockEl(document.getElementById("quiz-dock-slot"));
  }, []);
  const liveActiveId =
    typeof window === "undefined" ? null : getActiveRunId(conversationId);

  const questions = quiz?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const correctCount = Object.values(marks).filter((m) => m.isCorrect).length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);
  const earnedMarks = Object.values(marks).reduce(
    (sum, m) => sum + (m.marksEarned ?? 0),
    0,
  );
  const markedCount = Object.keys(marks).length;
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

  /**
   * Hints ride in the quiz metadata map keyed by question order, written by
   * the generate job. Old quizzes have no map and read as empty, which hides
   * the hint control instead of flashing a broken one.
   */
  const hints = useMemo(() => {
    const raw = (quizData?.quiz as QuizResponse | undefined)?.metadata?.hints;
    if (!raw || typeof raw !== "object") return {} as Record<string, string>;
    return raw;
  }, [quizData]);

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
    setHandoff(null);
    setPhase("generating");
    setError(null);
    setRetrying(false);
    const startWith = async (questionCount: number) => {
      const result = await api.mutations.quizzes.generate({
        noteId,
        questionCount,
        questionTypes: "MIXED",
        timed: false,
        source: "chat",
        conversationId,
      });
      setQuizId(result.quiz.id);
    };
    try {
      await startWith(count);
      setRetrying(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start the quiz.";
      if (
        /limit reached|insufficient credits|not ready|not found|no note/i.test(
          message,
        )
      ) {
        setPhase("setup");
        setError(message);
        return;
      }
      const looksLong = /length|cutoff|truncat|too long|too big/i.test(message);
      if (looksLong && count > 3) {
        setRetrying(true);
        try {
          const smaller = Math.max(3, Math.floor(count / 2));
          await startWith(smaller);
          setRetrying(false);
          return;
        } catch {
          setRetrying(false);
        }
      }
      const info = {
        noteId,
        noteTitle,
        topicText: noteTitle,
        retryWithCount: count > 3 ? Math.max(3, Math.floor(count / 2)) : null,
        formatChoice: mode === "flashcards" ? "Flashcards" : "Quiz",
      };
      setHandoff(info);
      saveQuizSnapshot(conversationId, {
        version: 5,
        quizId: null,
        answers: {},
        marks: {},
        currentIndex: 0,
        count,
        clientRunId: runId,
        updatedAt: Date.now(),
        mode,
        hintOpen: {},
        minimized: false,
        handoff: info,
      });
      setPhase("error");
      setError(
        looksLong
          ? "That set came out too long, so it stopped short."
          : message,
      );
    }
  }, [noteId, count, conversationId, noteTitle, mode]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const clearAttemptState = useCallback(() => {
    setTypedLetter("");
    setUnclearNotice(null);
    setGradeFailed(null);
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
    const marksTotal = question.marks ?? 1;
    const schemeMd =
      question.markSchemeMd ??
      `Correct choice earns ${marksTotal} mark${marksTotal === 1 ? "" : "s"}.`;
    const examinerNote = question.examinerNote ?? "";
    const prefix = announced ? `${announced} ` : "";
    const why = isCorrect
      ? `${prefix}That's correct.`
      : `${prefix}Not quite — the correct answer is ${question.correctAnswer}.`;
    setMarks((current) => ({
      ...current,
      [question.id]: {
        isCorrect,
        why,
        marksEarned: isCorrect ? marksTotal : 0,
        marksTotal,
        schemeMd,
        examinerNote,
      },
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
          marksEarned: graded.marksEarned ?? (graded.isCorrect ? 1 : 0),
          marksTotal: graded.marksTotal ?? currentQuestion.marks ?? 1,
          schemeMd:
            graded.schemeMd ??
            currentQuestion.markSchemeMd ??
            "See the model feedback for where each mark comes from.",
          examinerNote:
            graded.examinerNote ?? currentQuestion.examinerNote ?? "",
        },
      }));
      setGradeFailed(null);
    } catch {
      setMarks((current) => ({
        ...current,
        [currentQuestion.id]: {
          isCorrect: false,
          why: "Could not mark that answer just now. Try again.",
          marksEarned: 0,
          marksTotal: currentQuestion.marks ?? 1,
          schemeMd: currentQuestion.markSchemeMd ?? "",
          examinerNote: currentQuestion.examinerNote ?? "",
        },
      }));
      // The tap stays saved and the retry button below stays live, so a
      // failed grade or a stopped stream never loses the student's answer.
      setGradeFailed(currentQuestion.id);
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
    setFollowUpError(null);
    setTypedLetter("");
    setUnclearNotice(null);
    setReprompted({});
    setGradeFailed(null);
    setPhase("answering");
    saveQuizSnapshot(conversationId, {
      version: 4,
      quizId,
      answers: {},
      marks: {},
      currentIndex: 0,
      count,
      clientRunId: runId,
      updatedAt: Date.now(),
      mode: "quiz",
      hintOpen: {},
      minimized: false,
    });
  };

  const handleFollowUp = useCallback(
    async (kind: "harder" | "open") => {
      if (!result?.attempt.id) return;
      setFollowUpLoading(kind);
      setFollowUpError(null);
      try {
        const res = await fetch("/api/quizzes/generate/from-weak-areas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: result.attempt.id,
            count: 5,
            openOnly: kind === "open",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Could not start the follow up set.");
        }
        const nextId = data.quiz?.id as string | undefined;
        if (!nextId) throw new Error("Could not start the follow up set.");
        const runId = newQuizRunId();
        clearQuizSnapshot(conversationId, clientRunId);
        setClientRunId(runId);
        setQuizId(nextId);
        setQuiz(null);
        setAnswers({});
        setMarks({});
        setCurrentIndex(0);
        setResult(null);
        setPhase("generating");
      } catch (err) {
        setFollowUpError(
          err instanceof Error ? err.message : "Could not start follow up.",
        );
      } finally {
        setFollowUpLoading(null);
      }
    },
    [result, conversationId, clientRunId],
  );

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
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Try again
                </Button>
                {error ===
                "Full paper lives on the quiz page. Open it to continue." ? (
                  <Button variant="outline" asChild size="sm">
                    <Link href="/quizzes">Open full quiz page</Link>
                  </Button>
                ) : null}
              </div>
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
            <p className="font-medium">
              {retrying
                ? "That set ran long, trying a smaller set."
                : "Your quiz is being written."}
            </p>
            <ProgressLine
              message={
                retrying
                  ? "Trying a smaller set now."
                  : "Tip is building your questions."
              }
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
    const retryCount = handoff?.retryWithCount ?? null;
    const topic = handoff?.topicText ?? noteTitle ?? "this note";
    const freshParams = new URLSearchParams();
    if (handoff?.noteId) freshParams.set("noteId", handoff.noteId);
    if (topic) freshParams.set("topic", topic);
    if (retryCount) freshParams.set("count", String(retryCount));
    if (handoff?.formatChoice) freshParams.set("format", handoff.formatChoice);
    const freshHref = `/quizzes/new?${freshParams.toString()}`;
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
            <p className="font-medium">
              Practice paused here, two ways to continue.
            </p>
            <p className="text-sm text-muted-foreground">
              {error ?? "That set came out too long, so it stopped short."}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={() => {
                  if (retryCount) setCount(retryCount);
                  setPhase("setup");
                  setError(null);
                  setHandoff(null);
                  void handleStart();
                }}
              >
                Try {retryCount ?? 3} questions now
              </Button>
              <Button variant="outline" asChild>
                <Link href={freshHref}>Open fresh quiz start</Link>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Back to chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhase("setup");
                  setHandoff(null);
                  setError(null);
                }}
              >
                Change setup
              </Button>
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
    const docked =
      dockEl !== null &&
      (liveActiveId === null || liveActiveId === clientRunId);
    const currentHint = hints[String(currentQuestion.order)] ?? "";
    const hintIsOpen = hintOpen[currentQuestion.id] ?? false;

    const dotLabel = (index: number, id: string) => {
      const state = marks[id]
        ? marks[id].isCorrect
          ? "correct"
          : "incorrect"
        : id in answers
          ? "answered"
          : "unanswered";
      return `Question ${index + 1} of ${questions.length}, ${state}`;
    };

    if (minimized) {
      const bar = (
        <div className="mx-auto w-full max-w-[48rem] px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl border bg-card p-3 shadow-lg">
            <span className="sr-only">Practice quiz, minimized</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {noteTitle ?? "Quiz"}
              </p>
              <p className="text-xs text-muted-foreground">
                Question {currentIndex + 1} of {questions.length} •{" "}
                {correctCount} correct
              </p>
            </div>
            <Button size="sm" onClick={() => setMinimized(false)}>
              Restore
            </Button>
          </div>
        </div>
      );
      return docked ? createPortal(bar, dockEl) : bar;
    }

    const answeringNode = (
      <div className="mx-auto w-full max-w-[48rem] px-4 py-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="outline" className="max-w-full truncate">
                {noteTitle ?? "Quiz"}
              </Badge>
              <Badge variant="secondary">{currentQuestion.type}</Badge>
              <div className="flex rounded-md border p-0.5">
                <Button
                  size="sm"
                  variant={mode === "quiz" ? "default" : "ghost"}
                  onClick={() => setMode("quiz")}
                  className="h-7 px-2"
                >
                  Quiz
                </Button>
                <Button
                  size="sm"
                  variant={mode === "flashcards" ? "default" : "ghost"}
                  onClick={() => setMode("flashcards")}
                  className="h-7 px-2"
                >
                  Flashcards
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMinimized(true)}
              >
                Minimize
              </Button>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Back to chat
              </Button>
            </div>
          </div>
          <p
            id="quiz-runner-heading"
            tabIndex={-1}
            className="break-words text-sm text-muted-foreground sm:text-base"
          >
            Question {currentIndex + 1} of {questions.length} • {correctCount}{" "}
            correct among {markedCount} marked • {earnedMarks} of {totalMarks}{" "}
            marks
          </p>
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">Questions in this quiz</legend>
            {questions.map((question, index) => {
              const questionMark = marks[question.id];
              const answered = question.id in answers;
              const isCurrent = index === currentIndex;
              return (
                <Button
                  key={question.id}
                  type="button"
                  variant={isCurrent ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    setCurrentIndex(index);
                    clearAttemptState();
                    document
                      .getElementById("quiz-runner-heading")
                      ?.focus({ preventScroll: true });
                  }}
                  className={cn(
                    "h-11 min-w-11 rounded-full border px-2 text-xs font-semibold",
                    !isCurrent &&
                      questionMark &&
                      (questionMark.isCorrect
                        ? "border-primary text-primary"
                        : "border-destructive text-destructive"),
                    !isCurrent &&
                      !questionMark &&
                      answered &&
                      "border-primary/60 text-foreground",
                    !isCurrent &&
                      !questionMark &&
                      !answered &&
                      "text-muted-foreground",
                  )}
                >
                  {index + 1}
                  <span className="sr-only">
                    {dotLabel(index, question.id)}
                    {isCurrent ? ", current question" : ""}
                  </span>
                </Button>
              );
            })}
          </fieldset>
        </div>

        <Progress value={progress} className="mt-3" />

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

        <Card className="mt-3 flex max-h-[50dvh] w-full flex-col">
          <CardHeader className="shrink-0 space-y-3 pb-3">
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CardContent className="space-y-4 pt-1">
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
                    {mark.isCorrect ? "Correct" : "Incorrect"} •{" "}
                    {mark.marksEarned} of {mark.marksTotal} marks
                  </p>
                  <p className="text-sm break-words">{mark.why}</p>
                  {mark.schemeMd ? (
                    <div className="pt-2">
                      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                        Mark scheme
                      </p>
                      <div className="break-words text-sm">
                        <MathMarkdown content={mark.schemeMd} />
                      </div>
                    </div>
                  ) : null}
                  {mark.examinerNote ? (
                    <p className="break-words pt-1 text-xs opacity-90">
                      Examiner note: {mark.examinerNote}
                    </p>
                  ) : null}
                </div>
              )}

              {currentHint ? (
                <Collapsible
                  open={hintIsOpen}
                  onOpenChange={(open) =>
                    setHintOpen((current) => ({
                      ...current,
                      [currentQuestion.id]: open,
                    }))
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {hintIsOpen ? "Hide hint" : "Show hint"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="break-words text-sm text-muted-foreground">
                      {currentHint}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {gradeFailed === currentQuestion.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleMarkOpenAnswer()}
                  disabled={grading === currentQuestion.id}
                >
                  Try marking again
                </Button>
              ) : null}

              {grading === currentQuestion.id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Marking...
                </div>
              )}

              {!mark && !grading && currentIndex < questions.length - 1 ? (
                <p className="text-xs text-muted-foreground">
                  You can move freely. Unanswered questions stay open for later.
                </p>
              ) : null}
            </CardContent>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-3 pt-3 sm:flex sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentIndex((index) => Math.max(index - 1, 0));
              clearAttemptState();
              document
                .getElementById("quiz-runner-heading")
                ?.focus({ preventScroll: true });
            }}
            disabled={currentIndex === 0}
            className="w-full sm:w-auto"
          >
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
            Back
          </Button>

          <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-3">
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => {
                  handleNext();
                  clearAttemptState();
                  document
                    .getElementById("quiz-runner-heading")
                    ?.focus({ preventScroll: true });
                }}
                className="w-full sm:w-auto"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
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
    return docked ? createPortal(answeringNode, dockEl) : answeringNode;
  }

  // phase === "complete"
  const attemptTotalMarks =
    result?.attempt.totalMarks ?? totalMarks ?? questions.length;
  const attemptEarnedMarks = result?.attempt.marksEarned ?? earnedMarks;
  const attemptPercent =
    result?.attempt.score ??
    (attemptTotalMarks > 0
      ? Math.round((attemptEarnedMarks / attemptTotalMarks) * 100)
      : 0);
  return (
    <div className="mx-auto w-full max-w-[48rem] space-y-6 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
          <CardDescription>
            Review your performance and question by question feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-bold">{attemptPercent}%</p>
              <p className="text-xs text-muted-foreground">
                {attemptEarnedMarks} of {attemptTotalMarks} marks
              </p>
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
              Start over
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full">
              Back to chat
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-medium">Keep building on weak areas</p>
            <p className="text-xs text-muted-foreground">
              Tip picks the top missed ideas and builds the next set from them.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                size="sm"
                disabled={followUpLoading !== null}
                onClick={() => void handleFollowUp("harder")}
              >
                {followUpLoading === "harder"
                  ? "Building harder set..."
                  : "Harder set on weak areas"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={followUpLoading !== null}
                onClick={() => void handleFollowUp("open")}
              >
                {followUpLoading === "open"
                  ? "Building written set..."
                  : "Open written set for marking"}
              </Button>
            </div>
            {followUpError ? (
              <p className="text-xs text-destructive">
                {followUpError}{" "}
                {quizId ? (
                  <Link className="underline" href={`/quizzes/${quizId}`}>
                    Open the full quiz page
                  </Link>
                ) : null}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            This run is saved to your attempts, so chat practice counts like
            page practice.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const answer = result?.attempt.answers.find(
            (entry) => entry.questionId === question.id,
          );
          const scheme = answer?.markSchemeMd ?? question.markSchemeMd ?? "";
          const earned =
            answer?.marksEarned ?? marks[question.id]?.marksEarned ?? 0;
          const total = answer?.marksTotal ?? question.marks ?? 1;

          return (
            <Card key={question.id} className="w-full">
              <CardHeader className="space-y-3">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <CardTitle className="min-w-0 text-lg">
                      Question {index + 1}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {question.type} • {earned} of {total} marks
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
                {scheme ? (
                  <div>
                    <p className="mb-1 text-sm font-medium">Mark scheme</p>
                    <div className="overflow-x-auto rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      <MathMarkdown content={scheme} />
                    </div>
                  </div>
                ) : null}
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
