"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MathMarkdown } from "@/components/math-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressLine } from "@/components/ui/process-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import {
  clearActiveRunId,
  clearQuizSnapshot,
  getActiveRunId,
  loadQuizSnapshot,
  newQuizRunId,
  saveQuizSnapshot,
  type WizardDifficultyChoice,
  type WizardLevelChoice,
} from "@/lib/chat/quiz-snapshot";
import {
  defaultCount,
  defaultLevel,
  estimateMarks,
  prefillFromText,
  WIZARD_COUNTS,
  WIZARD_LEVELS,
} from "@/lib/chat/quiz-wizard";

type NotePick = { id: string; title: string };

function levelFormat(value: WizardLevelChoice): string {
  return WIZARD_LEVELS.find((l) => l.value === value)?.format ?? "Mixed format";
}

/**
 * The agentic setup wizard. Three steps inside chat: topic, then level plus
 * format, then count plus difficulty. Picks live in the browser snapshot
 * until generation, so reload resumes and the thread never waits on a tap.
 */
export function QuizSetupWizard({
  conversationId,
  noteId,
  noteTitle,
  onReady,
  onClose,
}: {
  conversationId: string;
  noteId: string | null;
  noteTitle: string | null;
  onReady: (quizId: string) => void;
  onClose: () => void;
}) {
  const [clientRunId] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return saved.clientRunId;
    }
    return newQuizRunId();
  });
  const [stepIndex, setStepIndex] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.stepIndex) return Math.min(3, Math.max(1, saved.stepIndex));
    }
    return 1;
  });
  const [topicText, setTopicText] = useState(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.topicText) return saved.topicText;
    }
    return noteTitle ?? "";
  });
  const [pickedNoteId, setPickedNoteId] = useState<string | null>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) return (saved.noteId as string | null) ?? noteId;
    }
    return noteId;
  });
  const [pickedNoteTitle, setPickedNoteTitle] = useState<string | null>(
    () => noteTitle,
  );
  const [level, setLevel] = useState<WizardLevelChoice>(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved?.levelChoice) return saved.levelChoice;
    }
    return defaultLevel();
  });
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] =
    useState<WizardDifficultyChoice>("STANDARD");
  const [otherText, setOtherText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [notes, setNotes] = useState<NotePick[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffQuizId, setHandoffQuizId] = useState<string | null>(null);
  const [confirmPrefill, setConfirmPrefill] = useState<string | null>(null);

  useEffect(() => {
    const active = getActiveRunId(conversationId);
    if (active) {
      const saved = loadQuizSnapshot(conversationId, active);
      if (saved) {
        if (saved.count) setCount(saved.count);
        if (saved.difficulty) setDifficulty(saved.difficulty);
        if (saved.collapsed) setCollapsed(true);
        return;
      }
    }
    const pre = prefillFromText(noteTitle ?? "");
    if (pre.count) setCount(pre.count);
    if (pre.difficulty) setDifficulty(pre.difficulty);
    if (pre.level) setLevel(pre.level);
  }, [conversationId, noteTitle]);

  useEffect(() => {
    let live = true;
    api.queries.notes
      .getAll()
      .then((res) => {
        if (!live) return;
        const picks = (res.notes ?? []).slice(0, 4).map((n) => ({
          id: n.id,
          title: n.title,
        }));
        setNotes(picks);
      })
      .catch(() => {
        if (live) setNotes([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const persist = useCallback(
    (patch: {
      stepIndex?: number;
      topicText?: string;
      noteId?: string | null;
      collapsed?: boolean;
    }) => {
      saveQuizSnapshot(conversationId, {
        version: 2,
        quizId: null,
        answers: {},
        marks: {},
        currentIndex: 0,
        count,
        clientRunId,
        updatedAt: Date.now(),
        topicText,
        noteId: pickedNoteId,
        noteTitle: pickedNoteTitle,
        levelChoice: level,
        formatChoice: levelFormat(level),
        difficulty,
        totalMarks: estimateMarks(count, difficulty),
        stepIndex,
        wizardDone: false,
        collapsed,
        ...patch,
      });
    },
    [
      conversationId,
      count,
      clientRunId,
      topicText,
      pickedNoteId,
      pickedNoteTitle,
      level,
      difficulty,
      stepIndex,
      collapsed,
    ],
  );

  useEffect(() => {
    persist({});
  }, [persist]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: wizard listener is scoped per conversation and reads latest step through the event detail
  useEffect(() => {
    (
      window as unknown as { __ticlearn_wizard_open?: string }
    ).__ticlearn_wizard_open = conversationId;
    const onText = (event: Event) => {
      const detail = (event as CustomEvent<{ text: string }>).detail;
      const text = detail?.text?.trim();
      if (!text) return;
      setCollapsed(false);
      advanceWithText(text);
    };
    window.addEventListener("ticlearn:wizard-text", onText as EventListener);
    return () => {
      window.removeEventListener(
        "ticlearn:wizard-text",
        onText as EventListener,
      );
      const flag = (window as unknown as { __ticlearn_wizard_open?: string })
        .__ticlearn_wizard_open;
      if (flag === conversationId) {
        (
          window as unknown as { __ticlearn_wizard_open?: string }
        ).__ticlearn_wizard_open = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, stepIndex, topicText, level, count, difficulty]);

  const marksPreview = useMemo(
    () => estimateMarks(count, difficulty),
    [count, difficulty],
  );

  function pickTopic(title: string, id: string | null) {
    const clean = title.trim();
    if (!clean) return;
    setTopicText(clean);
    setPickedNoteId(id);
    setPickedNoteTitle(clean);
    saveQuizSnapshot(conversationId, {
      version: 2,
      quizId: null,
      answers: {},
      marks: {},
      currentIndex: 0,
      count,
      clientRunId,
      updatedAt: Date.now(),
      topicText: clean,
      noteId: id,
      noteTitle: clean,
      levelChoice: level,
      formatChoice: levelFormat(level),
      difficulty,
      totalMarks: estimateMarks(count, difficulty),
      stepIndex: 2,
      wizardDone: false,
      collapsed: false,
    });
    setStepIndex(2);
    setError(null);
  }

  function advanceWithText(text: string) {
    const clean = text.trim();
    if (!clean) return;
    if (stepIndex === 1) {
      const match = (notes ?? []).find(
        (n) => n.title.toLowerCase() === clean.toLowerCase(),
      );
      pickTopic(clean, match?.id ?? pickedNoteId);
      return;
    }
    if (stepIndex === 2) {
      const pre = prefillFromText(clean);
      if (pre.level) {
        setLevel(pre.level);
        setStepIndex(3);
        setError(null);
        return;
      }
      const found = WIZARD_LEVELS.find(
        (l) =>
          l.title.toLowerCase() === clean.toLowerCase() ||
          l.value.toLowerCase() === clean.toLowerCase(),
      );
      if (found) {
        setLevel(found.value);
        setStepIndex(3);
        setError(null);
        return;
      }
      setConfirmPrefill(clean);
      return;
    }
    const pre = prefillFromText(clean);
    if (pre.count) setCount(pre.count);
    if (pre.difficulty) setDifficulty(pre.difficulty);
    if (pre.count || pre.difficulty) {
      setError(null);
      return;
    }
    const num = Number(clean);
    if (num === 5 || num === 10) {
      setCount(num);
      setError(null);
    }
  }

  function skipStep() {
    if (stepIndex === 1) {
      const fallbackTitle = noteTitle ?? topicText ?? "";
      pickTopic(fallbackTitle || "General review", pickedNoteId);
      return;
    }
    if (stepIndex === 2) {
      setLevel(defaultLevel());
      setStepIndex(3);
      return;
    }
    const d = defaultCount();
    setCount(d.count);
    setDifficulty(d.difficulty);
    void submit(d.count, d.difficulty, level);
  }

  async function submit(
    finalCount = count,
    finalDifficulty = difficulty,
    finalLevel = level,
  ) {
    const topic = topicText.trim();
    if (!topic) {
      setError("Pick or type a topic to continue.");
      setStepIndex(1);
      return;
    }
    setGenerating(true);
    setError(null);
    setHandoffQuizId(null);
    const payload = {
      topicText: topic,
      noteId: pickedNoteId,
      levelChoice: finalLevel,
      formatChoice: levelFormat(finalLevel),
      count: finalCount,
      difficulty: finalDifficulty,
    };
    try {
      const res = await api.mutations.quizzes.wizardGenerate(payload);
      setGenerating(false);
      saveQuizSnapshot(conversationId, {
        version: 2,
        quizId: res.quiz.id,
        answers: {},
        marks: {},
        currentIndex: 0,
        count: finalCount,
        clientRunId,
        updatedAt: Date.now(),
        topicText: topic,
        noteId: pickedNoteId,
        noteTitle: pickedNoteTitle,
        levelChoice: finalLevel,
        formatChoice: levelFormat(finalLevel),
        difficulty: finalDifficulty,
        totalMarks: estimateMarks(finalCount, finalDifficulty),
        stepIndex: 3,
        wizardDone: true,
        collapsed: false,
      });
      onReady(res.quiz.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start the quiz.";
      const looksLong = /length|cutoff|truncat|too long|too big|max/i.test(
        message,
      );
      if (looksLong && finalCount > 3) {
        try {
          const smaller = Math.max(3, Math.floor(finalCount / 2));
          const retry = await api.mutations.quizzes.wizardGenerate({
            ...payload,
            count: smaller,
          });
          setGenerating(false);
          onReady(retry.quiz.id);
          return;
        } catch {
          // Falls through to the handoff below.
        }
      }
      setGenerating(false);
      if (
        /limit reached|insufficient credits|not ready|not found/i.test(message)
      ) {
        setError(message);
        return;
      }
      setError("That set came out too long, so it stopped short.");
      setHandoffQuizId(null);
    }
  }

  function focusComposer() {
    document.querySelector("textarea")?.focus?.();
    window.dispatchEvent(
      new CustomEvent("ticlearn:wizard-focus-composer", { bubbles: true }),
    );
  }

  if (collapsed) {
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <Card className="w-full">
          <CardContent className="flex items-center justify-between gap-2 py-3">
            <p className="text-sm text-muted-foreground">
              Quiz setup paused. Your picks are kept.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCollapsed(false);
                persist({ collapsed: false });
              }}
            >
              Resume
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[48rem] space-y-4 px-4">
      <span className="sr-only">Quiz setup wizard</span>
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">Set up your quiz</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCollapsed(true);
                persist({ collapsed: true });
              }}
            >
              Close
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Step {stepIndex} of 3</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepIndex === 1 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Pick a topic</p>
              {notes === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-2/3" />
                </div>
              ) : notes.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No notes yet. Type a topic below and it will be studied
                    without a linked note.
                  </p>
                  <Link className="text-sm underline" href="/upload">
                    Upload a note
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((n, i) => (
                    <Button
                      key={n.id}
                      variant={pickedNoteId === n.id ? "default" : "outline"}
                      className="h-auto w-full justify-start p-3 text-left"
                      onClick={() => pickTopic(n.title, n.id)}
                    >
                      <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="min-w-0 break-words">
                        <MathMarkdown content={n.title} />
                      </span>
                    </Button>
                  ))}
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (otherText.trim()) {
                    const match = (notes ?? []).find(
                      (n) =>
                        n.title.toLowerCase() ===
                        otherText.trim().toLowerCase(),
                    );
                    pickTopic(otherText.trim(), match?.id ?? null);
                    setOtherText("");
                  }
                }}
              >
                <label className="sr-only" htmlFor="wizard-other-1">
                  Other topic
                </label>
                <Input
                  id="wizard-other-1"
                  placeholder="Other: type a topic"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                />
                <Button type="submit" disabled={!otherText.trim()}>
                  Send
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Or reply directly in the chat box below. Typing there moves this
                step forward too.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={focusComposer}
              >
                Or reply directly
              </Button>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Pick a level and format</p>
              <div className="space-y-2">
                {WIZARD_LEVELS.map((l, i) => (
                  <Button
                    key={l.value}
                    variant={level === l.value ? "default" : "outline"}
                    className="h-auto w-full justify-start p-3 text-left"
                    onClick={() => {
                      setLevel(l.value);
                      setStepIndex(3);
                      setError(null);
                    }}
                  >
                    <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {l.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {l.subtitle} · {l.format}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Or type it below or in the chat box. For example: HND.
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (otherText.trim()) {
                    advanceWithText(otherText.trim());
                    setOtherText("");
                  }
                }}
              >
                <label className="sr-only" htmlFor="wizard-other-2">
                  Other level
                </label>
                <Input
                  id="wizard-other-2"
                  placeholder="Other: type a level"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                />
                <Button type="submit" disabled={!otherText.trim()}>
                  Send
                </Button>
              </form>
              {confirmPrefill ? (
                <p className="text-xs text-muted-foreground">
                  Noted {confirmPrefill}. Pick a level above to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Pick count and difficulty. Total around {marksPreview} marks.
              </p>
              <div className="space-y-2">
                {WIZARD_COUNTS.map((c, i) => {
                  const active =
                    count === c.count && difficulty === c.difficulty;
                  return (
                    <Button
                      key={`${c.count}-${c.difficulty}-${i}`}
                      variant={active ? "default" : "outline"}
                      className="h-auto w-full justify-start p-3 text-left"
                      onClick={() => {
                        setCount(c.count);
                        setDifficulty(c.difficulty);
                      }}
                    >
                      <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {c.title} · {c.difficulty.toLowerCase()}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {c.subtitle}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (otherText.trim()) {
                    advanceWithText(otherText.trim());
                    setOtherText("");
                  }
                }}
              >
                <label className="sr-only" htmlFor="wizard-other-3">
                  Other count
                </label>
                <Input
                  id="wizard-other-3"
                  placeholder="Other: type 5 or 10, standard or hard"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                />
                <Button type="submit" disabled={!otherText.trim()}>
                  Send
                </Button>
              </form>
            </div>
          ) : null}

          {generating ? (
            <ProgressLine
              message="Tip is building your questions."
              estimate="It usually takes about a minute."
            />
          ) : null}

          {error ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">
                Practice paused here, two ways to continue.
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    void submit(
                      Math.max(3, Math.floor(count / 2)),
                      difficulty,
                      level,
                    );
                  }}
                >
                  Try {Math.max(3, Math.floor(count / 2))} questions now
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/quizzes/new?topic=${encodeURIComponent(topicText)}&count=${count}&format=${encodeURIComponent(levelFormat(level))}`}
                  >
                    Open fresh quiz start
                  </Link>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/quizzes">Open full quiz page</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {stepIndex > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStepIndex((s) => Math.max(1, s - 1))}
                >
                  Back
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={skipStep}>
                Skip
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Back to chat
              </Button>
              {stepIndex < 3 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (stepIndex === 1 && !topicText.trim()) {
                      setError("Pick or type to continue.");
                      return;
                    }
                    setStepIndex((s) => Math.min(3, s + 1));
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={generating || !topicText.trim()}
                  onClick={() => void submit()}
                >
                  {generating ? "Building" : "Start quiz"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function clearWizardRun(conversationId: string) {
  const active = getActiveRunId(conversationId);
  if (active) {
    clearQuizSnapshot(conversationId, active);
    clearActiveRunId(conversationId);
  }
}
