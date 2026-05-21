"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  ChevronRight,
  Clock,
  History,
  Loader2,
  Play,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  durationMin: number;
  sections: Array<{
    name: string;
    questionCount: number;
    totalMarks: number;
    questionType: string;
  }>;
}

type PaperComponentOption = {
  id: string;
  name: string;
  code: string;
  topics: Array<{ id: string; name: string }>;
  programName: string;
};

type RecentMockAttempt = {
  id: string;
  title: string;
  totalMarks: number;
  score: number | null;
  completedAt: string | null;
  startedAt: string;
  durationMin: number | null;
  inProgress: boolean;
};

function recentMockHref(a: RecentMockAttempt) {
  if (a.inProgress) return `/practice/mock/exam/${a.id}`;
  const pct =
    a.totalMarks > 0 && a.score != null
      ? Math.round((a.score / a.totalMarks) * 100)
      : 0;
  const scoreRounded = Math.round(Number(a.score) || 0);
  return `/practice/mock/result/${a.id}?score=${scoreRounded}&total=${a.totalMarks}&pct=${pct}`;
}

export default function MockListPage() {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loadingBlueprints, setLoadingBlueprints] = useState(true);

  const [components, setComponents] = useState<PaperComponentOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [componentId, setComponentId] = useState("");
  const [paper, setPaper] = useState<"PAPER_1" | "PAPER_2">("PAPER_1");
  const [scope, setScope] = useState<"FULL_SYLLABUS" | "TOPICS">(
    "FULL_SYLLABUS",
  );
  const [pickedTopics, setPickedTopics] = useState<Record<string, boolean>>({});

  const [generating, setGenerating] = useState<string | null>(null);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const [recentMocks, setRecentMocks] = useState<RecentMockAttempt[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((d) => setBlueprints(d.blueprints || []))
      .finally(() => setLoadingBlueprints(false));
  }, []);

  useEffect(() => {
    fetch("/api/mocks/options")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.components || []) as PaperComponentOption[];
        setComponents(list);
        setComponentId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => toast.error("Could not load your subjects"))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/mocks/recent")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && Array.isArray(d.attempts)) setRecentMocks(d.attempts);
        else setRecentMocks([]);
      })
      .catch(() => setRecentMocks([]))
      .finally(() => setRecentLoading(false));
  }, []);

  const selectedComp = components.find((c) => c.id === componentId);

  useEffect(() => {
    setPickedTopics({});
  }, [componentId]);

  const toggleTopic = (topicId: string, checked: boolean) => {
    setPickedTopics((prev) => ({ ...prev, [topicId]: checked }));
  };

  const startMock = async (blueprintId: string) => {
    setGenerating(blueprintId);
    try {
      const res = await fetch("/api/mocks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      router.push(`/practice/mock/exam/${data.mock.attemptId}`);
    } catch {
      toast.error("Failed to start mock");
      setGenerating(null);
    }
  };

  const startCustomMock = async () => {
    if (!componentId) {
      toast.error("Choose a subject paper first");
      return;
    }
    if (scope === "TOPICS") {
      const ids = Object.entries(pickedTopics)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (ids.length === 0) {
        toast.error("Select at least one topic");
        return;
      }
    }

    const topicIds =
      scope === "TOPICS"
        ? Object.entries(pickedTopics)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : undefined;

    setCreatingCustom(true);
    try {
      const res = await fetch("/api/mocks/generate-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId,
          paper,
          scope,
          topicIds,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not build mock",
        );
      setGenerateOpen(false);
      router.push(`/practice/mock/exam/${body.mock.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build mock");
    } finally {
      setCreatingCustom(false);
    }
  };

  if (loadingBlueprints && optionsLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );

  const canConfigureMock = !optionsLoading && components.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Mock exams
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Start a timed Paper 1 or Paper 2 session for your subject. Spin up a bespoke
            paper from the syllabus bank, or revisit school-published blueprints below.
          </p>
        </div>
        <div className="shrink-0 sm:pt-0.5">
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto"
                disabled={!canConfigureMock}
              >
                <Plus className="mr-2 size-4" aria-hidden strokeWidth={2.5} />
                Generate new mock
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton
              className="flex max-h-[min(520px,calc(100vh-6rem))] w-full flex-col gap-6 overflow-hidden sm:max-w-lg"
            >
              <DialogHeader className="shrink-0 text-left">
                <DialogTitle>Generate a bespoke mock</DialogTitle>
                <DialogDescription>
                  Paper options match your qualification. Topics mode scales time when you
                  pull a smaller subset.
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-1 grid min-h-0 flex-1 gap-6 overflow-y-auto px-1 pb-6">
                {!canConfigureMock ?
                  (
                    optionsLoading ?
                      (
                        <div className="flex justify-center py-10">
                          <Loader2 className="text-muted-foreground size-8 animate-spin" />
                        </div>
                      )
                    : (
                      <p className="text-muted-foreground px-3 text-center text-sm">
                        No paper exams are linked to your profile yet — finish onboarding or
                        check that your syllabus includes timed finals.
                      </p>
                    ))
                : <>
                    <div className="space-y-2 px-3">
                      <Label>Subject paper</Label>
                      <Select value={componentId} onValueChange={setComponentId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select paper" />
                        </SelectTrigger>
                        <SelectContent>
                          {components.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.programName} — {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 px-3">
                      <Label>Format</Label>
                      <RadioGroup
                        value={paper}
                        onValueChange={(v) =>
                          setPaper(v as "PAPER_1" | "PAPER_2")
                        }
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <label className="has-[[data-state=checked]]:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3 ring-transparent transition-[box-shadow,border-color] ring-2">
                          <RadioGroupItem value="PAPER_1" id="p1-modal" />
                          <div className="min-w-0">
                            <span className="font-medium">Paper 1</span>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              50 MCQs · 90 minutes · totals 50 marks
                            </p>
                          </div>
                        </label>
                        <label className="has-[[data-state=checked]]:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3 ring-transparent transition-[box-shadow,border-color] ring-2">
                          <RadioGroupItem value="PAPER_2" id="p2-modal" />
                          <div className="min-w-0">
                            <span className="font-medium">Paper 2</span>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              8 structured questions · two hours · 100 marks nominal
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3 px-3">
                      <Label>Scope</Label>
                      <RadioGroup
                        value={scope}
                        onValueChange={(v) =>
                          setScope(v as "FULL_SYLLABUS" | "TOPICS")
                        }
                        className="flex flex-col gap-2"
                      >
                        <label className="has-[[data-state=checked]]:ring-primary flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 ring-transparent ring-2">
                          <RadioGroupItem value="FULL_SYLLABUS" id="full-modal" />
                          <span className="text-sm font-medium leading-none">
                            Full syllabus
                          </span>
                        </label>
                        <label className="has-[[data-state=checked]]:ring-primary flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3 ring-transparent ring-2">
                          <RadioGroupItem value="TOPICS" id="topics-opt-modal" />
                          <div className="space-y-1">
                            <span className="text-sm font-medium leading-none">
                              Selected topics only
                            </span>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              Pick syllabus units below — generators bias items from those
                              areas before filling the quota.
                            </p>
                          </div>
                        </label>
                      </RadioGroup>

                      {scope === "TOPICS" && selectedComp ? (
                        <div className="border-muted mt-2 max-h-48 overflow-y-auto rounded-xl border bg-muted/20 p-3">
                          {selectedComp.topics.length === 0 ? (
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              No granular topics wired for this offering yet — switch back to full
                              syllabus.
                            </p>
                          ) : (
                            <div className="grid gap-2">
                              {selectedComp.topics.map((t) => (
                                <label
                                  key={t.id}
                                  className="flex cursor-pointer items-center gap-2 text-sm"
                                >
                                  <Checkbox
                                    checked={!!pickedTopics[t.id]}
                                    onCheckedChange={(c) =>
                                      toggleTopic(t.id, c === true)
                                    }
                                  />
                                  <span>{t.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </>
                }
              </div>
              {canConfigureMock ? (
                <div className="border-t bg-muted/30 -mx-4 -mb-4 mt-auto flex-shrink-0 space-y-2 px-6 py-4">
                  <Button
                    type="button"
                    className="w-full rounded-full"
                    size="lg"
                    disabled={creatingCustom}
                    onClick={startCustomMock}
                  >
                    {creatingCustom ?
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Building session…
                      </>
                    : <>
                        <Play className="mr-2 size-4" aria-hidden />
                        Launch timed mock
                      </>
                    }
                  </Button>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {recentLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      ) : recentMocks.length > 0 ?
        (
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold tracking-tight">Recent mocks</h2>
              <Badge variant="outline" className="text-muted-foreground text-[11px]">
                Saved sessions · newest first
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentMocks.map((a) => {
                const pct =
                  !a.inProgress && a.totalMarks > 0 && a.score != null
                    ? Math.round((a.score / a.totalMarks) * 100)
                    : null;
                return (
                  <Card key={a.id} className="border-border shadow-sm">
                    <CardHeader className="border-b pb-4">
                      <CardTitle className="line-clamp-2 text-base leading-snug font-semibold">
                        {a.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {pct !== null ? (
                          <Badge
                            variant="secondary"
                            className="border-primary/20 bg-primary/10 font-mono text-[13px] text-primary"
                          >
                            +{pct}%
                          </Badge>
                        ) : a.inProgress ? (
                          <Badge
                            variant="secondary"
                            className="border border-amber-500/25 bg-amber-500/10 text-[12px] text-amber-700 dark:text-amber-400"
                          >
                            In progress
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-muted-foreground text-[11px]"
                          >
                            Unscored file
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <dl className="text-muted-foreground flex flex-col gap-2 text-[13px]">
                        <div className="flex items-start gap-2">
                          <ClipboardList
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden
                          />
                          <div>
                            <dt className="sr-only">Marks</dt>
                            <dd>
                              {a.score != null && !a.inProgress ?
                                `${Math.round(Number(a.score))}/${a.totalMarks} marks`
                              : `${a.totalMarks} marks target`}
                            </dd>
                          </div>
                        </div>
                        {typeof a.durationMin === "number" ?
                          (
                            <div className="flex items-start gap-2">
                              <Clock
                                className="mt-0.5 size-3.5 shrink-0"
                                aria-hidden
                              />
                              <div>
                                <dt className="sr-only">Timed for</dt>
                                <dd>{a.durationMin} min session</dd>
                              </div>
                            </div>
                          )
                        : null}
                        <div className="flex items-start gap-2">
                          <History
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden
                          />
                          <div>
                            <dt className="sr-only">Last activity</dt>
                            <dd>
                              Updated{" "}
                              {formatRelativeTime(
                                a.completedAt ?? a.startedAt,
                              )}
                            </dd>
                          </div>
                        </div>
                      </dl>
                    </CardContent>
                    <CardFooter className="flex justify-end border-t pt-4">
                      <Button
                        asChild
                        className="rounded-full bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        <Link href={recentMockHref(a)}>
                          Open
                          <ChevronRight
                            className="ml-2 size-4 opacity-90"
                            aria-hidden
                          />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )
      : null}

      {loadingBlueprints ? (
        blueprints.length === 0 ?
          (
            <div className="text-muted-foreground flex justify-center py-6">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )
        : null)
      : blueprints.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">More mocks</h2>
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            Published blueprints surfaced by your cohort — timed windows follow what your
            school configured.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {blueprints.map((bp) => (
              <Card key={bp.id} className="border-muted/70 shadow-none">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">{bp.name}</CardTitle>
                  {bp.description ?
                    (
                      <CardDescription className="text-sm leading-relaxed">
                        {bp.description}
                      </CardDescription>
                    )
                  : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{bp.totalMarks} marks</Badge>
                    <Badge>{bp.durationMin} min</Badge>
                  </div>
                  <div className="divide-border divide-y rounded-lg border text-sm">
                    {bp.sections.map((sec, i) => (
                      <div
                        key={`${bp.id}:${i}`}
                        className="flex flex-wrap gap-2 px-4 py-2.5 [&>span:last-child]:ml-auto [&>span:last-child]:tabular-nums"
                      >
                        <span className="text-muted-foreground">{sec.name}</span>
                        <span>
                          {sec.questionCount}× {sec.questionType} · {sec.totalMarks} marks
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    className="w-full rounded-full"
                    variant="outline"
                    onClick={() => startMock(bp.id)}
                    disabled={generating === bp.id || creatingCustom}
                  >
                    {generating === bp.id ?
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    : (
                      <Play className="mr-2 size-4" aria-hidden />
                    )}
                    Start mock
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* No school blueprints; bespoke generator still lives in modal. */}
          {!recentMocks.length ?
            (
              optionsLoading ?
                null
              : (
                  <Card className="border-dashed shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Kick off your first bespoke mock</CardTitle>
                      <CardDescription>
                        Use Generate new mock to pull from the syllabus bank while we wait on
                        school-shared papers.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )
              )
            : null}
        </>
      )}
    </div>
  );
}
