"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Loader2, Clock, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractMcqFromPlainText } from "@/lib/mcq-parse";

type McqOption = { letter: string; label: string };

interface SectionData {
  name: string;
  questionCount: number;
  totalMarks: number;
  questionType: string;
  answerRule: string | null;
  marksPerQuestion: number | null;
  questions?: Array<{
    questionId: string;
    text: string;
    type: string;
    marks: number;
    options?: McqOption[];
    correctOption?: string;
  }>;
}

type FlatQuestion = {
  questionId: string;
  stem: string;
  marks: number;
  sectionName: string;
  /** MCQ picks one letter; STRUCTURED leaves free text */
  mode: "MCQ" | "STRUCTURED";
  options: McqOption[];
};

const LETTERS_FALLBACK = ["A", "B", "C", "D"] as const;

function flattenAndNormalizeExam(sections: SectionData[]): FlatQuestion[] {
  const out: FlatQuestion[] = [];
  for (const sec of sections) {
    type Q = NonNullable<SectionData["questions"]>[number];
    const list: Q[] = sec.questions?.length
      ? sec.questions
      : Array.from({ length: Math.max(sec.questionCount, 0) }, (_, i) => ({
          questionId: `placeholder_${sec.name}_${i}`,
          text: "",
          type: sec.questionType,
          marks:
            sec.marksPerQuestion ??
            Math.ceil(sec.totalMarks / Math.max(sec.questionCount, 1)),
        }));

    for (let i = 0; i < list.length; i++) {
      const q = list[i]!;
      const stableId =
        typeof q.questionId === "string" && q.questionId.length > 0
          ? q.questionId
          : `fallback_${sec.name}_${i}`;

      let stem = q.text?.trim() ?? "";

      const isMcq =
        sec.questionType === "MCQ" || String(q.type).toUpperCase() === "MCQ";

      if (isMcq) {
        let labelTexts = (Array.isArray(q.options) ? q.options : [])
          .slice(0, 4)
          .map((o: McqOption) => (o.label || "").trim());

        if (
          stem.length > 0 &&
          (labelTexts.length < 2 || labelTexts.filter(Boolean).length < 2)
        ) {
          const parsed = extractMcqFromPlainText(q.text ?? "");
          if (parsed?.options?.length && parsed.options.length >= 2) {
            stem = parsed.stem;
            labelTexts = parsed.options
              .map((o) => (o.label || "").trim())
              .slice(0, 4);
          }
        }

        const options = LETTERS_FALLBACK.map((letter, idx) => ({
          letter,
          label: labelTexts[idx] ?? "",
        }));

        out.push({
          questionId: stableId,
          stem,
          marks:
            typeof q.marks === "number"
              ? q.marks
              : (sec.marksPerQuestion ??
                Math.ceil(sec.totalMarks / Math.max(sec.questionCount, 1))),
          sectionName: sec.name,
          mode: "MCQ",
          options,
        });
      } else {
        out.push({
          questionId: stableId,
          stem,
          marks:
            typeof q.marks === "number"
              ? q.marks
              : (sec.marksPerQuestion ??
                Math.ceil(sec.totalMarks / Math.max(sec.questionCount, 1))),
          sectionName: sec.name,
          mode: "STRUCTURED",
          options: [],
        });
      }
    }
  }
  return out;
}

export default function MockExamPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [sections, setSections] = useState<SectionData[]>([]);
  const [blueprintName, setBlueprintName] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);
  const [durationMin, setDurationMin] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);

  /** Wall-clock when learner pressed Start — for timeTaken on submit */
  const startedAtRef = useRef<number | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const autoSubmitTriggered = useRef(false);

  useEffect(() => {
    fetch(`/api/mocks/attempts/${attemptId}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          toast.error(
            typeof data.error === "string" ? data.error : "Failed to load mock",
          );
          router.push("/practice/mock");
          setLoading(false);
          return;
        }
        const secs = Array.isArray(data.sections) ? data.sections : [];
        if (secs.length === 0) {
          toast.error("This mock session has no questions.");
          router.push("/practice/mock");
          setLoading(false);
          return;
        }
        setSections(secs);
        setBlueprintName(data.blueprint?.name || "");
        setTotalMarks(
          typeof data.blueprint?.totalMarks === "number"
            ? data.blueprint.totalMarks
            : 0,
        );
        const dur =
          typeof data.blueprint?.durationMin === "number"
            ? data.blueprint.durationMin
            : 0;
        setDurationMin(dur);
        const seconds = Math.max(dur * 60, 0);
        setTimeLeft(seconds);
        setAnswers((data.answers as Record<string, string>) || {});
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load mock");
        router.push("/practice/mock");
        setLoading(false);
      });
  }, [attemptId, router]);

  const flatQuestions = useMemo(
    () => flattenAndNormalizeExam(sections),
    [sections],
  );

  /** Fixed order from this mock attempt’s payload (`session_payload`). */
  const [examQueue, setExamQueue] = useState<FlatQuestion[]>([]);

  const activeQuestions =
    examStarted && examQueue.length > 0 ? examQueue : flatQuestions;
  const totalQ = activeQuestions.length;
  const current = activeQuestions[currentIdx];
  const isLastQuestion = totalQ > 0 && currentIdx >= totalQ - 1;
  const progressPct =
    totalQ > 0 ? Math.round(((currentIdx + 1) / totalQ) * 100) : 0;

  useEffect(() => {
    if (!examStarted || loading) return;
    const id = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [examStarted, loading]);

  useEffect(() => {
    autoSubmitTriggered.current = false;
  }, [examStarted, attemptId]);

  const handleSubmit = useCallback(async () => {
    if (!examStarted || submitting) return;
    if (!confirm("Submit your mock exam?")) return;
    setSubmitting(true);
    try {
      const start = startedAtRef.current ?? Date.now();
      const timeTaken = Math.floor((Date.now() - start) / 1000);
      const res = await fetch("/api/mocks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers, timeTaken }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      router.push(
        `/practice/mock/result/${attemptId}?score=${data.score}&total=${data.totalMarks}&pct=${data.percentage}`,
      );
    } catch {
      toast.error("Failed to submit");
    }
    setSubmitting(false);
  }, [examStarted, submitting, attemptId, answers, router]);

  const autoSubmit = useCallback(() => {
    if (submitting || !examStarted || autoSubmitTriggered.current) return;
    autoSubmitTriggered.current = true;
    toast.warning("Time's up! Submitting...");
    void (async () => {
      setSubmitting(true);
      try {
        const start = startedAtRef.current ?? Date.now();
        const timeTaken = Math.floor((Date.now() - start) / 1000);
        const res = await fetch("/api/mocks/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers, timeTaken }),
        });
        if (!res.ok) throw new Error("Submit failed");
        const data = await res.json();
        router.push(
          `/practice/mock/result/${attemptId}?score=${data.score}&total=${data.totalMarks}&pct=${data.percentage}`,
        );
      } catch {
        toast.error("Failed to submit");
        autoSubmitTriggered.current = false;
      }
      setSubmitting(false);
    })();
  }, [examStarted, submitting, attemptId, answers, router]);

  useEffect(() => {
    if (!examStarted || loading || durationMin <= 0) return;
    if (timeLeft !== 0) return;
    if (submitting || autoSubmitTriggered.current) return;
    autoSubmit();
  }, [examStarted, loading, durationMin, timeLeft, submitting, autoSubmit]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const goToMocksHub = () => {
    router.push("/practice/mock");
  };

  const leaveExamConfirm = () => {
    if (submitting) return;
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            "Leave this mock? Answers aren’t submitted yet — reopen this attempt from Mock exams when you’re ready.",
          )
        : true;
    if (ok) goToMocksHub();
  };

  const startExam = () => {
    autoSubmitTriggered.current = false;
    startedAtRef.current = Date.now();
    const seconds =
      typeof durationMin === "number" && durationMin > 0
        ? Math.max(durationMin * 60, 0)
        : 0;
    setTimeLeft(seconds);
    setExamQueue(flatQuestions.slice());
    setExamStarted(true);
    setCurrentIdx(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-[60vh]">
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && examStarted) return;
          if (!open) {
            router.push("/practice/mock");
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={!examStarted}
          className="flex max-h-[min(94vh,calc(100dvh-0.75rem))] w-[calc(100vw-1.25rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl lg:w-[calc(100vw-2.5rem)] xl:max-w-6xl 2xl:max-w-[72rem]"
          onInteractOutside={(e) => examStarted && e.preventDefault()}
          onEscapeKeyDown={(e) => examStarted && e.preventDefault()}
        >
          {!examStarted ? (
            <>
              <DialogHeader className="border-b bg-background px-6 py-5 text-left">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground -ml-2 mb-2 w-fit gap-1 px-2"
                  onClick={goToMocksHub}
                >
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
                <DialogTitle className="pr-10 text-xl">
                  {blueprintName || "Practice mock"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  Multiple-choice paper: pick one letter per question.
                  Structured questions use a written response. Nothing is timed
                  until you tap{" "}
                  <strong className="text-foreground">Start exam</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 px-6 py-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{totalMarks} marks</Badge>
                  {durationMin > 0 ? (
                    <Badge variant="secondary">
                      Timer: {durationMin} min once started
                    </Badge>
                  ) : null}
                  <Badge variant="outline">{totalQ} questions</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  You will answer one question at a time inside this window. Use{" "}
                  <span className="text-foreground">Previous</span> /{" "}
                  <span className="text-foreground">Next</span> at the bottom to
                  review. Submit appears only on the last question.
                </p>
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={startExam}
                >
                  Start exam
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b bg-background px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-start gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Back to mocks"
                    disabled={submitting}
                    onClick={leaveExamConfirm}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold leading-snug">
                      {blueprintName}
                    </h2>
                    <p className="text-muted-foreground text-xs">
                      {current?.sectionName} · Question{" "}
                      {Math.min(currentIdx + 1, totalQ)}
                      {" of "}
                      {totalQ}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {durationMin > 0 ? (
                      <div
                        className={cn(
                          "flex items-center gap-2 font-mono text-lg",
                          examStarted &&
                            durationMin > 0 &&
                            timeLeft < 300 &&
                            timeLeft > 0 &&
                            "text-destructive",
                        )}
                      >
                        <Clock className="size-5 shrink-0" />
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                    ) : null}
                    <Badge variant="outline">{answeredCount} answered</Badge>
                  </div>
                </div>
                <Progress value={progressPct} className="mt-3 h-1.5" />
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-5">
                {current ? (
                  <div
                    key={current.questionId}
                    className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-150"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        Question {currentIdx + 1}
                      </p>
                      <Badge variant="outline">{current.marks} marks</Badge>
                    </div>
                    {current.stem ? (
                      <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
                        {current.stem}
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic">No stem.</p>
                    )}

                    {current.mode === "MCQ" ? (
                      <RadioGroup
                        value={answers[current.questionId] ?? ""}
                        onValueChange={(v) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [current.questionId]: v,
                          }))
                        }
                        className="mt-4 grid gap-2"
                      >
                        {current.options.map((opt) => {
                          const id = `${current.questionId}-${opt.letter}`;
                          return (
                            <label
                              key={opt.letter}
                              htmlFor={id}
                              className={cn(
                                "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/60",
                              )}
                            >
                              <RadioGroupItem
                                value={opt.letter}
                                id={id}
                                className="mt-0.5"
                              />
                              <span className="text-sm leading-snug">
                                <span className="font-semibold">
                                  {opt.letter}.
                                </span>{" "}
                                {opt.label ? (
                                  opt.label
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    (select this option if it is correct)
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      <div className="mt-4">
                        <Label
                          htmlFor={`open-${current.questionId}`}
                          className="text-muted-foreground mb-2 block text-xs"
                        >
                          Your answer
                        </Label>
                        <Textarea
                          id={`open-${current.questionId}`}
                          placeholder="Write your answer here…"
                          value={answers[current.questionId] ?? ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [current.questionId]: e.target.value,
                            }))
                          }
                          rows={6}
                          className="resize-y min-h-[120px]"
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="border-t bg-muted/40 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Previous question"
                      disabled={currentIdx <= 0 || submitting}
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[200px] sm:flex-row sm:justify-end">
                    {isLastQuestion ? (
                      <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting}
                        size="lg"
                        className="w-full sm:min-w-[200px]"
                      >
                        {submitting ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 size-4" />
                        )}
                        Submit mock
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        className="w-full sm:min-w-[200px]"
                        disabled={submitting || currentIdx >= totalQ - 1}
                        onClick={() =>
                          setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))
                        }
                      >
                        Next
                        <ChevronRight className="ml-2 size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
