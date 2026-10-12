"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MockMcqOption } from "@/lib/mock-generator";
import type { MockReviewPerQuestionRow } from "@/lib/mock-scoring";
import {
  RotateCw,
  Home,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lightbulb,
} from "lucide-react";

type AttemptApi = {
  id: string;
  score: number | null;
  totalMarks: number;
  completedAt: string | null;
};

type ReviewPayload = {
  perQuestion: MockReviewPerQuestionRow[];
  sectionSummary: Array<{
    sectionName: string;
    totalMarks: number;
    earned: number;
    questionCount?: number;
  }> | null;
};

function letterFromPct(p: number): string {
  if (p >= 85) return "A*";
  if (p >= 75) return "A";
  if (p >= 65) return "B";
  if (p >= 55) return "C";
  if (p >= 45) return "D";
  return "E";
}

function formatMcqWithLabel(letter: string, opts?: MockMcqOption[]): string {
  const L = letter.trim().toUpperCase().slice(0, 1);
  if (!L || L === "?") return "—";
  const label = opts?.find(
    (o) => o.letter?.toUpperCase()?.slice(0, 1) === L,
  )?.label;
  return label ? `${L} — ${label}` : L;
}

function isMcqRow(row: MockReviewPerQuestionRow) {
  return row.questionType.toUpperCase() === "MCQ" || row.correctOption != null;
}

export default function MockResultPage() {
  const params = useParams();
  const attemptId =
    typeof params.attemptId === "string" ? params.attemptId : "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptApi | null>(null);
  const [review, setReview] = useState<ReviewPayload | null>(null);

  const urlScore = Number(searchParams.get("score") ?? 0);
  const urlTotal = Number(searchParams.get("total") ?? 0);
  const urlPct = Number(searchParams.get("pct") ?? 0);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(`/api/mocks/attempts/${attemptId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            typeof body?.error === "string" ? body.error : res.statusText,
          );
        return body as {
          attempt: AttemptApi | undefined;
          review: ReviewPayload | null | undefined;
        };
      })
      .then((data) => {
        if (cancelled) return;
        setAttempt(data.attempt ?? null);
        setReview(data.review ?? null);
        setFetchError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError("Could not load this result from the server.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const totalMarks =
    attempt?.totalMarks && attempt.totalMarks > 0
      ? attempt.totalMarks
      : urlTotal > 0
        ? urlTotal
        : 1;

  const score =
    attempt?.completedAt && attempt.score != null ? attempt.score : urlScore;

  const pct =
    totalMarks > 0
      ? Math.round((score / Math.max(totalMarks, 1)) * 100)
      : urlPct;

  const recoveredPct = pct;
  const missedMarks = Math.max(0, totalMarks - score);

  const currentLetter = letterFromPct(pct);
  const targetPctBump = Math.min(
    100 - pct,
    Math.max(
      Math.round(totalMarks ? missedMarks / 2 : 10),
      Math.round((100 - pct) * 0.22),
    ),
  );
  const targetLetter =
    pct >= 90 ? letterFromPct(100) : letterFromPct(pct + targetPctBump);

  const weakHints = useMemo(() => {
    if (!review?.sectionSummary?.length) return [];
    const rows = review.sectionSummary
      .filter((s) => s.totalMarks > 0)
      .map((s) => ({
        sectionName: s.sectionName,
        rate: s.totalMarks > 0 ? s.earned / s.totalMarks : 1,
      }))
      .sort((a, b) => a.rate - b.rate);
    const worst = rows.filter((r) => r.rate < 1).slice(0, 2);
    if (worst.length) return worst.map((w) => w.sectionName);
    return rows.slice(0, 1).map((w) => w.sectionName);
  }, [review?.sectionSummary]);

  const gradeColor =
    pct >= 65
      ? "text-primary"
      : pct >= 40
        ? "text-foreground"
        : "text-destructive";
  const gradeLabel =
    pct >= 85
      ? "Strong performance"
      : pct >= 65
        ? "Solid — tighten weak topics"
        : pct >= 40
          ? "Momentum building — drill gaps"
          : "Keep practising — revise mistakes below";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1)
      router.back();
    else router.push("/practice/mock");
  };

  const [reviewFilter, setReviewFilter] = useState<"wrong" | "all">("wrong");
  const [reviewOpen, setReviewOpen] = useState(false);

  const shownQuestions =
    reviewFilter === "wrong" && review
      ? review.perQuestion.filter((q) => q.earned < q.maxMarks)
      : (review?.perQuestion ?? []);

  const hasReview = !!review?.perQuestion?.length;

  return (
    <div className="text-card-foreground mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      {loading ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-sm">Loading your breakdown…</p>
        </div>
      ) : (
        <>
          {fetchError ? (
            <p className="text-destructive text-center text-sm">{fetchError}</p>
          ) : null}

          <Card className="border-border bg-card ring-foreground/10 overflow-hidden border shadow-sm ring-1">
            <CardHeader className="relative border-b border-border pb-6 text-center sm:pb-5">
              <Badge
                variant="secondary"
                className="bg-primary/15 text-primary mx-auto mb-3 w-fit"
              >
                Mock exam complete
              </Badge>
              <CardTitle className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {gradeLabel}
              </CardTitle>
              <CardDescription className="text-base">
                {score} / {totalMarks} marks · {pct}% overall
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7 pt-6 sm:space-y-8 sm:pt-7">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`text-6xl font-bold tabular-nums ${gradeColor}`}
                >
                  {pct}%
                </div>
                <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">
                  Score snapshot
                </p>
              </div>

              <Progress value={pct} className="h-3 rounded-full bg-muted" />

              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/40 p-5">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
                    Mark momentum
                  </p>
                  <p className="text-primary mt-3 text-3xl font-semibold tracking-tight">
                    {recoveredPct}%
                    <span className="text-muted-foreground ml-2 text-lg font-normal">
                      secured
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {missedMarks > 0 ? (
                      <>
                        Roughly{" "}
                        <span className="text-foreground font-medium tabular-nums">
                          +{missedMarks}
                        </span>{" "}
                        marks still on the table on this sitting — revisiting
                        flagged gaps is fastest leverage before your next timed
                        round.
                      </>
                    ) : (
                      <>
                        Full marks booked on this sitting — replicate the pacing
                        on a fresh paper to stay exam-fit.
                      </>
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-5">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
                    Grade pathway
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <div className="text-center">
                      <p className="text-muted-foreground text-[10px] uppercase">
                        Current
                      </p>
                      <span className="bg-background text-muted-foreground mt-2 inline-flex size-14 items-center justify-center rounded-xl border border-border text-3xl font-bold">
                        {currentLetter}
                      </span>
                    </div>
                    <ArrowRight
                      className="text-muted-foreground size-8 shrink-0"
                      aria-hidden
                    />
                    <div className="text-center">
                      <p className="text-muted-foreground text-[10px] uppercase">
                        Target band
                      </p>
                      <span className="text-primary mt-2 inline-flex size-14 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-3xl font-bold">
                        {targetLetter}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                    Targets assume you convert a chunk of misses on your weakest
                    areas — directional, not a guarantee.
                  </p>
                </div>
              </section>

              {(weakHints.length > 0 || hasReview) && (
                <div className="rounded-xl border border-border bg-accent/25 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Lightbulb className="text-primary size-5" aria-hidden />
                    <span className="font-medium">Coach-style next step</span>
                    <Badge
                      variant="outline"
                      className="border-primary/25 text-[10px] text-accent-foreground"
                    >
                      Focus
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {weakHints.length ? (
                      <>
                        Aim your next recap at{" "}
                        <span className="text-foreground font-medium">
                          {weakHints.slice(0, 2).join(" · ")}
                        </span>
                        {weakHints.length > 2
                          ? " and related subtopics."
                          : " — tighten definitions, sketches, then re-test with a lighter drill set."}
                      </>
                    ) : (
                      "Great balance across sections on this sitting — skim anything you hesitated on, then sit another mock while it is fresh."
                    )}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="tabular-nums text-2xl font-bold">{pct}%</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Weighted score
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                  <p className="tabular-nums text-2xl font-bold">
                    {score}/{totalMarks}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Raw marks
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground mx-auto rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                Ready for round two? Starting another attempt generates a fresh
                timed session (new submissions are separate from this score).
              </div>

              {!hasReview && (
                <p className="text-muted-foreground text-center text-sm">
                  Detailed question breakdown is not stored for every historical
                  mock (for example syllabus-only setups). Sit another timed
                  practice to unlock line-by-line review.
                </p>
              )}

              {hasReview ? (
                <>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      size="lg"
                      className="rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                      onClick={() => setReviewOpen(true)}
                    >
                      See wrong answers
                    </Button>
                  </div>

                  <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                    <DialogContent
                      showCloseButton
                      className="flex h-[min(calc(100dvh-1.5rem),72rem)] w-[min(100vw-1.5rem,80rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 text-base text-card-foreground shadow-2xl ring-1 ring-foreground/10 sm:max-w-none sm:w-[min(100vw-2.5rem,80rem)]"
                    >
                      <div className="border-border shrink-0 space-y-4 border-b bg-muted/20 px-6 py-5 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:px-10 sm:py-6">
                        <DialogHeader className="min-w-0 flex-1 space-y-2 p-0 text-left">
                          <DialogTitle className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                            See wrong answers
                          </DialogTitle>
                          <DialogDescription className="text-muted-foreground text-sm sm:text-[15px]">
                            Compare your responses with the keyed answers.
                            Multiple-choice rows show option labels whenever we
                            saved them from the generator.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex shrink-0 justify-end pt-2 sm:pt-0">
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            size="default"
                            value={reviewFilter}
                            onValueChange={(v) =>
                              v && setReviewFilter(v as typeof reviewFilter)
                            }
                          >
                            <ToggleGroupItem value="wrong" className="px-4">
                              Incorrect only
                            </ToggleGroupItem>
                            <ToggleGroupItem value="all" className="px-4">
                              All questions
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-10 sm:py-8">
                        {shownQuestions.length === 0 ? (
                          <p className="text-muted-foreground py-10 text-center text-sm">
                            {reviewFilter === "wrong"
                              ? "Nothing to show — you answered every graded item cleanly on file."
                              : "No indexed questions available for review."}
                          </p>
                        ) : (
                          <Accordion
                            type="multiple"
                            className="divide-border w-full divide-y rounded-xl border border-border px-2 sm:px-4 [&_[data-slot=accordion-trigger]]:py-5 [&_[data-slot=accordion-trigger]]:text-[15px] [&_[data-slot=accordion-trigger]]:sm:text-base"
                          >
                            {shownQuestions.map((row, idx) => {
                              const mcq = isMcqRow(row);
                              const pickedLetter = row.userAnswer
                                .trim()
                                .toUpperCase()
                                .slice(0, 1)
                                .replace(/[^A-D]/, "");
                              const wrong = mcq
                                ? Boolean(
                                    row.correctOption
                                      ? pickedLetter !== row.correctOption
                                      : row.earned < row.maxMarks,
                                  )
                                : row.earned < row.maxMarks;
                              return (
                                <AccordionItem
                                  key={row.questionId}
                                  value={row.questionId}
                                  className="border-0"
                                >
                                  <AccordionTrigger className="items-start hover:no-underline">
                                    <div className="text-left">
                                      <div className="flex flex-wrap gap-2 pb-2">
                                        <Badge
                                          variant="outline"
                                          className="text-[11px] uppercase sm:text-xs"
                                        >
                                          Q {idx + 1}
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="bg-primary/15 text-[11px] capitalize text-primary sm:text-xs"
                                        >
                                          {row.sectionName}
                                        </Badge>
                                        {wrong ? (
                                          <Badge
                                            variant="destructive"
                                            className="text-[11px] sm:text-xs"
                                          >
                                            Missed
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="bg-primary/15 text-[11px] text-primary hover:bg-primary/15 sm:text-xs"
                                          >
                                            Correct
                                          </Badge>
                                        )}
                                        <span className="text-muted-foreground text-xs tabular-nums sm:text-[13px]">
                                          +{row.earned}/{row.maxMarks} marks
                                        </span>
                                      </div>
                                      <span className="text-foreground mt-2 block font-normal whitespace-normal leading-relaxed">
                                        {row.stem || "(No stem stored)"}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="bg-muted/30 mt-4 space-y-4 rounded-xl border border-border p-5 sm:p-6">
                                      <div>
                                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                          Your answer
                                        </p>
                                        <p className="mt-3 text-[15px] leading-relaxed sm:text-base">
                                          {mcq
                                            ? formatMcqWithLabel(
                                                row.userAnswer,
                                                row.options,
                                              )
                                            : row.userAnswer
                                              ? row.userAnswer
                                              : "(blank)"}
                                        </p>
                                      </div>
                                      <Separator />
                                      <div>
                                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                          Expected
                                        </p>
                                        {mcq ? (
                                          <p className="mt-3 text-[15px] font-medium leading-relaxed sm:text-base">
                                            {row.correctOption
                                              ? formatMcqWithLabel(
                                                  row.correctOption,
                                                  row.options,
                                                )
                                              : "Marked if you responded"}
                                          </p>
                                        ) : row.modelAnswer ? (
                                          <p className="text-foreground mt-3 whitespace-pre-wrap text-[15px] leading-relaxed sm:text-base">
                                            {row.modelAnswer}
                                          </p>
                                        ) : (
                                          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed sm:text-base">
                                            {`${row.maxMarks}-mark structured item — no model answer on file (common for syllabus-bank-only pulls). Compare with your notes or past papers.`}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : null}

              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  variant="outline"
                  className="sm:min-w-[140px]"
                  onClick={goBack}
                >
                  <ArrowLeft className="mr-2 size-4" aria-hidden />
                  Back
                </Button>
                <Button
                  size="lg"
                  className="sm:min-w-[220px]"
                  onClick={() => router.push("/practice/mock")}
                >
                  <RotateCw className="mr-2 size-4" aria-hidden />
                  Take another attempt
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="sm:min-w-[180px]"
                  onClick={() => router.push("/dashboard")}
                >
                  <Home className="mr-2 size-4" aria-hidden />
                  Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
