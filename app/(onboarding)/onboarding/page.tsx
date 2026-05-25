"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronLeft, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding-store";

type ExamLevel = { id: string; name: string; code: string };
type Program = { id: string; name: string; code: string };
type Topic = { id: string; name: string; order: number };
type Component = { id: string; code: string; name: string; topics: Topic[] };

const STEP_NAMES = [
  "Level",
  "Subjects",
  "Exam Date",
  "Confidence",
  "Study Plan",
  "Phone",
];

function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  return fetch(url, options).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  });
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const store = useOnboardingStore();
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<ExamLevel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [phoneDigits, setPhoneDigits] = useState("");
  const [readiness, setReadiness] = useState<{
    readiness: number;
    weakestTopic: string | null;
    weakestProgram: string | null;
    daysUntilExam: number | null;
    highRisk: boolean;
    programReadiness: Array<{ program: string; readiness: number }>;
  } | null>(null);
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [animateIn, setAnimateIn] = useState(true);
  const [step, setStepInner] = useState(store.step > 0 ? store.step : 0);
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isGCEAlevel = store.examLevelId
    ? levels.find((l) => l.id === store.examLevelId)?.code === "GCE_AL"
    : false;
  const isGCEOlevel = store.examLevelId
    ? levels.find((l) => l.id === store.examLevelId)?.code === "GCE_OL"
    : false;
  const isHND = store.examLevelId
    ? levels.find((l) => l.id === store.examLevelId)?.code === "HND"
    : false;
  const isMultiSelect = isGCEAlevel || isGCEOlevel;

  useEffect(() => {
    if (!session) return;
    if (initialized) return;

    apiFetch<{ readiness: number; needsAssessment: boolean }>(
      "/api/onboarding/readiness",
    )
      .then((d) => {
        if (d.needsAssessment === false && d.readiness > 0) {
          router.push("/dashboard");
          return;
        }
      })
      .catch(() => {});

    apiFetch<{ levels: ExamLevel[] }>("/api/exam-levels")
      .then((d) => {
        if (Array.isArray(d.levels)) {
          setLevels(d.levels);
          if (store.examLevelId) {
            const level = d.levels.find((l) => l.id === store.examLevelId);
            if (level) {
              apiFetch<{ programs: Program[] }>(
                `/api/programs?examLevelId=${level.id}`,
              ).then((pd) => {
                const filtered = pd.programs.filter(
                  (p) => p.code !== "UNKNOWN",
                );
                setPrograms(filtered);
              });
            }
          }
          if (store.programIds.length > 0) {
            loadTopics(store.programIds[0]);
          }
        }
      })
      .catch(() => {});

    setInitialized(true);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    apiFetch<{ readiness: number; needsAssessment: boolean }>(
      "/api/onboarding/readiness",
    )
      .then((d) => {
        if (d.needsAssessment === false && d.readiness > 0) {
          router.push("/dashboard");
        }
      })
      .catch(() => {});
  }, [step]);

  const setStep = (s: number) => {
    setStepInner(s);
    store.setStep(s);
  };

  const goToStep = (s: number, dir: "next" | "prev") => {
    setDirection(dir);
    setAnimateIn(false);
    setTimeout(() => {
      setStep(s);
      setAnimateIn(true);
    }, 200);
  };

  const handleStepContinue = async (): Promise<number | null> => {
    switch (step) {
      case 0:
        return 1;
      case 1:
        return 2;
      case 2:
        if (store.programIds.length > 0) {
          await loadTopics(store.programIds[0]);
        }
        return 3;
      case 3:
        return 4;
      case 4:
        return 5;
      case 5:
        await handleFinalize();
        return null;
      default:
        return null;
    }
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError(null);
    try {
      const baselineEntries = Object.entries(baselines)
        .filter(([, v]) => v > 0)
        .map(([topicId, confidence]) => ({ topicId, confidence }));

      const res = await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examLevelId: store.examLevelId,
          programIds: store.programIds,
          examYear: store.examYear,
          examDate: store.examDate,
          baselines: baselineEntries,
          isRetaking: store.isRetaking,
          studyHoursPerWeek: store.studyHoursPerWeek,
          phoneCountryCode: "+237",
          phoneNumber: phoneDigits,
          skipped: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();

      store.reset();

      setShowAnalyzing(true);
      const rd = data.readiness;
      setReadiness(rd);
      setShowAnalyzing(false);
      goToStep(5, "next");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setSaving(false);
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await fetch("/api/onboarding/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: true }),
      });
      store.reset();
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
    setSaving(false);
  };

  const loadTopics = async (programId: string) => {
    try {
      const d = await apiFetch<{ components: Component[] }>(
        `/api/onboarding/topics?programId=${programId}`,
      );
      if (d.components) {
        setComponents(d.components);
        const defaults: Record<string, number> = {};
        for (const comp of d.components) {
          for (const topic of comp.topics || []) {
            defaults[topic.id] = baselines[topic.id] || 3;
          }
        }
        setBaselines(defaults);
      }
    } catch {
      // silent
    }
  };

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  if (!session) return null;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">
                What exam are you preparing for?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Select your exam level to get started.
              </p>
            </div>
            <div className="space-y-3">
              {levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    store.setExamLevelId(level.id);
                    setStepInner(0);
                    apiFetch<{ programs: Program[] }>(
                      `/api/programs?examLevelId=${level.id}`,
                    )
                      .then((d) => {
                        const filtered = d.programs.filter(
                          (p) => p.code !== "UNKNOWN",
                        );
                        setPrograms(filtered);
                        goToStep(1, "next");
                      })
                      .catch((e) => setError(e.message));
                  }}
                  disabled={saving}
                  className="group relative w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                >
                  <p className="text-base font-semibold">
                    {level.code === "GCE_AL" && "🎓 "}
                    {level.code === "GCE_OL" && "📚 "}
                    {level.code === "HND" && "🛠️ "}
                    {level.name}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {level.code === "GCE_AL" &&
                      "Upper Sixth - Advanced Level general certificate"}
                    {level.code === "GCE_OL" &&
                      "Form 5 - Ordinary Level general certificate"}
                    {level.code === "HND" &&
                      "Higher National Diploma - specialised programme"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">
                {isHND ? "Select your specialty" : "Select your subjects"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isHND
                  ? "Choose your HND programme."
                  : isMultiSelect
                    ? "Choose the subjects you are preparing for."
                    : "Choose your subject."}
              </p>
              {isMultiSelect && store.programIds.length > 4 && (
                <p className="mt-2 text-xs text-amber-600">
                  Most students prepare 2–4 subjects.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {programs.map((prog) => {
                const selected = store.programIds.includes(prog.id);
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => {
                      if (isHND) {
                        store.setProgramIds([prog.id]);
                      } else {
                        const newIds = selected
                          ? store.programIds.filter((x) => x !== prog.id)
                          : [...store.programIds, prog.id];
                        store.setProgramIds(newIds);
                      }
                    }}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <span className="whitespace-nowrap">{prog.name}</span>
                  </button>
                );
              })}
            </div>
            {store.programIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {store.programIds.length} selected
              </p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">When is your exam?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This helps us track your countdown.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  value: "june2026" as const,
                  label: "June 2026",
                  sub: "Most GCE exams - recommended",
                },
                {
                  value: "nextyear" as const,
                  label: "Next year",
                  sub: "Planning ahead",
                },
                {
                  value: "unsure" as const,
                  label: "Not sure yet",
                  sub: "No countdown - that's OK",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === "june2026") {
                      store.setExamDate(2026, "2026-06-01");
                    } else if (opt.value === "nextyear") {
                      store.setExamDate(2027, null);
                    } else {
                      store.setExamDate(null, null);
                    }
                  }}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                    (opt.value === "june2026" &&
                      store.examYear === 2026 &&
                      store.examDate === "2026-06-01") ||
                    (opt.value === "nextyear" &&
                      store.examYear === 2027 &&
                      !store.examDate) ||
                    (opt.value === "unsure" &&
                      !store.examYear &&
                      !store.examDate)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.sub}</p>
                </button>
              ))}
              <div className="pt-2">
                <label className="text-sm text-muted-foreground">
                  Or pick a specific date:
                </label>
                <input
                  type="date"
                  value={store.examDate || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    store.setExamDate(
                      val ? new Date(val).getFullYear() : null,
                      val || null,
                    );
                  }}
                  className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">Rate your confidence</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                How confident are you in each area? 1 = Need help, 5 = Very
                confident.
              </p>
            </div>
            {components.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Topics are not yet available for this subject. You can skip this
                step.
              </div>
            ) : (
              <div className="space-y-6">
                {components.map((comp) => (
                  <div key={comp.id}>
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {comp.name}
                    </h3>
                    <div className="space-y-3">
                      {comp.topics.map((topic) => (
                        <div key={topic.id}>
                          <div className="mb-1 flex items-center justify-between">
                            <label className="text-sm font-medium">
                              {topic.name}
                            </label>
                            <span
                              className={`text-xs font-bold ${
                                (baselines[topic.id] || 3) <= 2
                                  ? "text-red-500"
                                  : (baselines[topic.id] || 3) <= 3
                                    ? "text-amber-500"
                                    : "text-green-500"
                              }`}
                            >
                              {baselines[topic.id] || 3}/5
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() =>
                                  setBaselines((prev) => ({
                                    ...prev,
                                    [topic.id]: v,
                                  }))
                                }
                                className={`h-9 flex-1 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                                  (baselines[topic.id] || 3) === v
                                    ? v <= 2
                                      ? "bg-red-500 text-white"
                                      : v === 3
                                        ? "bg-amber-500 text-white"
                                        : "bg-green-500 text-white"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">
                Tell us about your preparation
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Helps us personalise your study plan.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                Are you retaking this exam?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => store.setStudyIntent(true, store.studyHoursPerWeek)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                    store.isRetaking
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => store.setStudyIntent(false, store.studyHoursPerWeek)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all active:scale-[0.97] ${
                    !store.isRetaking
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                Hours per week you study?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "3", label: "<5 hours", sub: "Light" },
                  { value: "7", label: "5 - 10 hours", sub: "Moderate" },
                  { value: "15", label: "10 - 20 hours", sub: "Dedicated" },
                  { value: "25", label: "20+ hours", sub: "Intensive" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      store.setStudyIntent(
                        store.isRetaking,
                        parseInt(opt.value),
                      )
                    }
                    className={`rounded-xl border-2 p-4 text-left transition-all active:scale-[0.97] ${
                      store.studyHoursPerWeek === parseInt(opt.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">Phone number verification</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter a valid Cameroon phone number so our team can contact you when needed.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Country</label>
              <Select value="CM" disabled>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CM">Cameroon (+237)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone number</label>
              <div className="flex items-center rounded-xl border border-input bg-background px-3">
                <span className="pr-2 text-sm font-semibold text-muted-foreground">+237</span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={9}
                  value={phoneDigits}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setPhoneDigits(digits);
                  }}
                  placeholder="6XXXXXXXX"
                  className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter at least 9 digits (for example: 6XXXXXXXX).
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 text-center">
            {showAnalyzing ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Analyzing your preparation...
                </p>
              </div>
            ) : readiness ? (
              <>
                <div>
                  <h1 className="text-2xl font-bold">You're all set!</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Here's your readiness snapshot.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-28 w-28 items-center justify-center rounded-full border-[5px] text-3xl font-bold ${
                      readiness.readiness >= 70
                        ? "border-green-500 text-green-600"
                        : readiness.readiness >= 40
                          ? "border-amber-500 text-amber-600"
                          : "border-red-500 text-red-600"
                    }`}
                  >
                    {readiness.readiness}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Readiness Score
                  </p>
                </div>

                {readiness.weakestProgram && (
                  <p className="text-sm">
                    Weakest area:{" "}
                    <span className="font-medium">
                      {readiness.weakestProgram}
                    </span>
                  </p>
                )}

                {readiness.daysUntilExam !== null && (
                  <p className="text-sm text-muted-foreground">
                    {readiness.daysUntilExam > 0
                      ? `${readiness.daysUntilExam} days until your exam`
                      : "Your exam has passed. Time to prepare for the next one!"}
                  </p>
                )}

                {readiness.highRisk && (
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    ⚠️ Exam is approaching and readiness is low. We recommend
                    starting practice immediately.
                  </div>
                )}

                {readiness.programReadiness &&
                  readiness.programReadiness.length > 0 && (
                    <div className="space-y-2">
                      {readiness.programReadiness.map((p) => (
                        <div
                          key={p.program}
                          className="flex items-center gap-3"
                        >
                          <span className="w-32 text-left text-sm">
                            {p.program}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                p.readiness >= 70
                                  ? "bg-green-500"
                                  : p.readiness >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${p.readiness}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-medium">
                            {p.readiness}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                <div className="flex flex-col gap-3 pt-4">
                  <Button size="lg" onClick={() => router.push("/dashboard")}>
                    Start First Practice <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/practice")}
                  >
                    Take a Full Mock Exam
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!store.examLevelId;
      case 1:
        return store.programIds.length > 0;
      case 2:
        return store.examYear !== null || store.examDate !== null;
      case 3:
        return true;
      case 4:
        return store.studyHoursPerWeek !== null;
      case 5:
        return phoneDigits.length >= 9;
      default:
        return false;
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {step < 6 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {totalSteps}
            </span>
            <span>{STEP_NAMES[step]}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`transition-all duration-[250ms] ease-in-out ${
          animateIn
            ? "translate-x-0 opacity-100"
            : direction === "next"
              ? "translate-x-8 opacity-0"
              : "-translate-x-8 opacity-0"
        }`}
      >
        {renderStep()}
      </div>

      {step < 6 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => goToStep(step - 1, "prev")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {saving ? "Saving..." : "Skip"}
            </button>
            {step < 5 ? (
              <Button
                onClick={async () => {
                  const next = await handleStepContinue();
                  if (next !== null) goToStep(next, "next");
                }}
                disabled={!canProceed()}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalize}
                disabled={saving || !canProceed()}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
