"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { useSession } from "@/lib/auth-client";

type ExamLevel = { id: string; name: string; code: string };
type Program = { id: string; name: string; code: string };
type Topic = { id: string; name: string; order: number };
type Component = { id: string; code: string; name: string; topics: Topic[] };

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [levels, setLevels] = useState<ExamLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [examYear, setExamYear] = useState("");
  const [examDate, setExamDate] = useState("");
  const [components, setComponents] = useState<Component[]>([]);
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [isRetaking, setIsRetaking] = useState(false);
  const [studyHours, setStudyHours] = useState(5);
  const [readiness, setReadiness] = useState<{
    readiness: number;
    weakestTopic: string | null;
  } | null>(null);

  useEffect(() => {
    if (!session) return;

    // Check if onboarding already completed
    fetch("/api/onboarding/readiness")
      .then((r) => r.json())
      .then((d) => {
        if (d.needsAssessment === false && d.readiness > 0) {
          router.push("/dashboard");
        }
      })
      .catch(() => {});

    apiFetch("/api/exam-levels")
      .then((d) => { if (Array.isArray(d.levels)) setLevels(d.levels); })
      .catch((e) => console.error("Failed to load exam levels:", e));
  }, [session]);

  const handleNext = async () => {
    setSaving(true);
    setError(null);
    try {
      switch (step) {
        case 1:
          setStep(2);
          break;
        case 2:
          await apiFetch("/api/onboarding/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: 2, data: { programId: selectedProgram } }),
          });
          setStep(3);
          break;
        case 3:
          await apiFetch("/api/onboarding/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step: 3,
              data: { examYear: examYear ? parseInt(examYear) : null, examDate: examDate || null },
            }),
          });
          setStep(4);
          break;
        case 4:
          await apiFetch("/api/onboarding/baseline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              baselines: Object.entries(baselines).map(([topicId, confidence]) => ({
                topicId,
                confidence,
              })),
            }),
          });
          setStep(5);
          break;
        case 5:
          await apiFetch("/api/onboarding/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: 5, data: { isRetaking, studyHoursPerWeek: studyHours } }),
          });
          await apiFetch("/api/onboarding/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: 6, data: {} }),
          });
          const rd = await apiFetch("/api/onboarding/readiness");
          setReadiness(rd);
          setStep(6);
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const loadPrograms = async (levelId: string) => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/programs?examLevelId=${levelId}`);
      if (Array.isArray(d.programs)) setPrograms(d.programs);
    } catch (e) {
      console.error("Failed to load programs:", e);
    }
    setLoading(false);
  };

  const loadTopics = async (programId: string) => {
    setLoading(true);
    try {
      const d = await apiFetch(`/api/onboarding/topics?programId=${programId}`);
      if (d.components) {
        setComponents(d.components);
        const defaults: Record<string, number> = {};
        for (const comp of d.components) {
          for (const topic of comp.topics || []) {
            defaults[topic.id] = 3;
          }
        }
        setBaselines(defaults);
      }
    } catch (e) {
      console.error("Failed to load topics:", e);
    }
    setLoading(false);
  };

  if (!session) return null;

  const totalSteps = 6;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps - 1 }, (_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step > i + 1
                  ? "bg-primary text-primary-foreground"
                  : step === i + 1
                    ? "border-2 border-primary text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < totalSteps - 2 && <div className={`h-0.5 flex-1 ${step > i + 1 ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Exam Level</CardTitle>
            <CardDescription>Choose the exam you are preparing for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {levels.map((level) => (
              <button
                key={level.id}
                type="button"
                onClick={() => {
                  setSelectedLevel(level.id);
                  setSelectedProgram(null);
                  setPrograms([]);
                  setComponents([]);
                  setBaselines({});
                  loadPrograms(level.id);
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedLevel === level.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">{level.name}</p>
                <p className="text-sm text-muted-foreground">{level.code.replace("_", " ")}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Program</CardTitle>
            <CardDescription>Choose your subject or specialty.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              programs
                .filter((p) => p.code !== "UNKNOWN")
                .map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => {
                      setSelectedProgram(program.id);
                      loadTopics(program.id);
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedProgram === program.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-medium">{program.name}</p>
                    <p className="text-sm text-muted-foreground">{program.code}</p>
                  </button>
                ))
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Session</CardTitle>
            <CardDescription>When is your exam? This helps us track your countdown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="year">Exam Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2026"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Exam Date (optional)</Label>
              <Input
                id="date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Skip if unsure. Countdown will be disabled.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Rate Your Confidence</CardTitle>
            <CardDescription>
              For each topic, rate your current confidence from 1 (need help) to 5 (very confident).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              components.map((comp) => (
                <div key={comp.id}>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">{comp.name}</h3>
                  <div className="space-y-4">
                    {comp.topics.map((topic) => (
                      <div key={topic.id} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <Label>{topic.name}</Label>
                          <Badge variant={getConfidenceVariant(baselines[topic.id] || 3)}>
                            {baselines[topic.id] || 3}/5
                          </Badge>
                        </div>
                        <Slider
                          value={[baselines[topic.id] || 3]}
                          min={1}
                          max={5}
                          step={1}
                          onValueChange={([v]) =>
                            setBaselines((prev) => ({ ...prev, [topic.id]: v }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Study Intent</CardTitle>
            <CardDescription>Help us personalize your experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Are you retaking this exam?</Label>
              <div className="mt-2 flex gap-3">
                <Button
                  variant={isRetaking ? "default" : "outline"}
                  onClick={() => setIsRetaking(true)}
                >
                  Yes
                </Button>
                <Button
                  variant={!isRetaking ? "default" : "outline"}
                  onClick={() => setIsRetaking(false)}
                >
                  No
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Study hours per week: {studyHours}</Label>
              <Slider value={[studyHours]} min={1} max={40} step={1} onValueChange={([v]) => setStudyHours(v)} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1h</span>
                <span>40h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && readiness && (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">You're all set!</CardTitle>
            <CardDescription>Here's your readiness snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary text-3xl font-bold text-primary">
                {readiness.readiness}%
              </div>
              <p className="text-sm text-muted-foreground">Readiness Score</p>
            </div>
            {readiness.weakestTopic && (
              <p className="text-sm">Focus area: <span className="font-medium">{readiness.weakestTopic}</span></p>
            )}
            <Button size="lg" onClick={() => router.push("/dashboard")}>
              Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step < 6 && (
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} disabled={saving || !canProceed(step, { selectedLevel, selectedProgram, examYear, baselines })}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {step === 5 ? "Finish" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function canProceed(step: number, state: { selectedLevel: string | null; selectedProgram: string | null; examYear: string; baselines: Record<string, number> }) {
  switch (step) {
    case 1: return !!state.selectedLevel;
    case 2: return !!state.selectedProgram;
    case 3: return true;
    case 4: return Object.keys(state.baselines).length > 0;
    case 5: return true;
    default: return false;
  }
}

function getConfidenceVariant(confidence: number): "destructive" | "secondary" | "default" {
  if (confidence <= 2) return "destructive";
  if (confidence <= 3) return "secondary";
  return "default";
}
