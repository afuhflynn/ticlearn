"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEVELS } from "@/constants/levels";
import {
  useFinishOnboarding,
  useOnboardingProgress,
  useSaveOnboardingStep,
  useStartOnboarding,
} from "@/hooks/useOnboarding";
import { GOAL_VALUES } from "@/lib/onboarding/validation";

type Answers = {
  levelOfStudy?: string;
  targetGoal?: string;
  institution?: string;
  program?: string;
  faculty?: string;
};

export default function SmartSetupChatPage() {
  const router = useRouter();
  const progressQuery = useOnboardingProgress();
  const start = useStartOnboarding();
  const save = useSaveOnboardingStep();
  const finish = useFinishOnboarding();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [school, setSchool] = useState({ institution: "", program: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start.mutate(undefined, {
      onError: () => setNotice("Setup could not start. Reload and try again."),
    });
  }, [start]);

  useEffect(() => {
    const data = progressQuery.data;
    if (!data) return;
    const saved = (data.answers ?? {}) as Answers;
    setAnswers(saved);
    setStep(Math.min(Math.max(data.currentStep ?? 0, 0), 3));
    if (saved.institution || saved.program) {
      setSchool({
        institution: saved.institution ?? "",
        program: saved.program ?? "",
      });
    }
  }, [progressQuery.data]);

  const total = 4;
  const busy = save.isPending || finish.isPending || start.isPending;

  async function persist(
    stepKey: "level" | "goal" | "school",
    next: Answers,
    nextStep: number,
  ) {
    setNotice(null);
    try {
      await save.mutateAsync({ step: nextStep, stepKey, answers: next });
      setStep(nextStep);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That did not save. Try again.",
      );
    }
  }

  function pickLevel(value: string) {
    const next = { ...answers, levelOfStudy: value };
    setAnswers(next);
    void persist("level", next, 1);
  }

  function pickGoal(value: string) {
    const next = { ...answers, targetGoal: value };
    setAnswers(next);
    void persist("goal", next, 2);
  }

  function submitSchool() {
    if (
      school.institution.trim().length < 2 ||
      school.program.trim().length < 2
    ) {
      setNotice("Tell me your school and your program in plain words.");
      return;
    }
    const next = {
      ...answers,
      institution: school.institution.trim(),
      program: school.program.trim(),
    };
    setAnswers(next);
    void persist("school", next, 3);
  }

  async function complete() {
    setNotice(null);
    if (!answers.levelOfStudy || !answers.targetGoal) {
      setNotice("Pick your year and your goal first.");
      return;
    }
    try {
      await finish.mutateAsync({
        levelOfStudy: answers.levelOfStudy,
        targetGoal: answers.targetGoal,
        institution: answers.institution,
        program: answers.program,
        faculty: answers.faculty,
      });
      router.push("/dashboard");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Finish failed. Try again.",
      );
    }
  }

  async function skip() {
    setNotice(null);
    try {
      await save.mutateAsync({
        step,
        stepKey: "level",
        answers: {},
        skipped: true,
      });
      router.push("/dashboard");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Skip failed. Try again.",
      );
    }
  }

  if (progressQuery.isLoading || start.isPending) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle>Getting your setup ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="h-4 w-2/3 animate-pulse rounded bg-muted"
            aria-hidden="true"
          />
          <div
            className="h-10 w-full animate-pulse rounded-xl bg-muted"
            aria-hidden="true"
          />
          <div
            className="h-10 w-full animate-pulse rounded-xl bg-muted"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    );
  }

  if (progressQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup hit a snag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We could not load your saved step. Reload to try again, or skip and
            finish later.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => progressQuery.refetch()}>Retry</Button>
            <Button variant="ghost" onClick={skip}>
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {step + 1} of {total}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 0 && "What year are you in?"}
            {step === 1 && "What is your main goal?"}
            {step === 2 && "Where do you study?"}
            {step === 3 && "Does this look right?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice && (
            <p role="alert" className="rounded-lg border bg-muted p-3 text-sm">
              {notice}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                One tap. Tip uses this to pitch explanations at the right depth.
              </p>
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  disabled={busy}
                  onClick={() => pickLevel(level.value)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    answers.levelOfStudy === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="font-semibold">{level.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {level.blurb}
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                One tap. We point your first week at this target.
              </p>
              {GOAL_VALUES.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  disabled={busy}
                  onClick={() => pickGoal(goal as string)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    answers.targetGoal === goal
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="font-semibold">{goal}</span>
                </button>
              ))}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setStep(0)}
              >
                Back
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Type your school and your program in plain words.
              </p>
              <div className="space-y-2">
                <Label htmlFor="smart-institution">School</Label>
                <Input
                  id="smart-institution"
                  value={school.institution}
                  onChange={(e) =>
                    setSchool({ ...school, institution: e.target.value })
                  }
                  placeholder="e.g. University of Buea"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smart-program">Program</Label>
                <Input
                  id="smart-program"
                  value={school.program}
                  onChange={(e) =>
                    setSchool({ ...school, program: e.target.value })
                  }
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button disabled={busy} onClick={submitSchool}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Year: {answers.levelOfStudy ?? "missing"} · Goal:{" "}
                {answers.targetGoal ?? "missing"}
                {answers.institution ? ` · ${answers.institution}` : ""}
                {answers.program ? ` · ${answers.program}` : ""}
              </p>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button disabled={busy} onClick={complete}>
                  Finish and open dashboard
                </Button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button variant="ghost" disabled={busy} onClick={skip}>
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
