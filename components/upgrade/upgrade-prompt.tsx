"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/hooks/usePlans";
import { useUsage } from "@/hooks/useUsage";
import { type PromptEventName, recordPromptEvent } from "@/lib/prompt-events";

interface UpgradePromptProps {
  score?: number;
  surface?: "quiz" | "tip";
  used?: number;
  cap?: number;
  kind?: string;
  onDismiss?: () => void;
}

function tierByKey(
  tiers: Array<{
    key: string;
    priceXaf: number;
    limits: Record<string, number>;
  }>,
  key: string,
) {
  return tiers.find((t) => t.key === key) ?? null;
}

export function UpgradePromptSkeleton() {
  return (
    <div className="rounded-xl border p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-2 h-9 w-32" />
    </div>
  );
}

export function UpgradePrompt({
  score,
  surface = "quiz",
  used,
  cap,
  kind,
  onDismiss,
}: UpgradePromptProps) {
  const { prompt, usage, limits, isLoading: usageLoading } = useUsage();
  const { tiers, isLoading: plansLoading, isError: plansError } = usePlans();
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);

  const isFirstPass = score !== undefined;
  const resolvedUsed =
    used ??
    (surface === "quiz" ? usage.quizGenerations : usage.aiTutorMessages);
  const resolvedCap =
    cap ??
    (surface === "quiz" ? limits.quizGenerations : limits.aiTutorMessages);
  const resolvedKind = kind ?? (isFirstPass ? "first_pass" : undefined);

  useEffect(() => {
    if (isFirstPass && (score ?? 0) < 50) return;
    if (prompt.dismissedToday) return;
    recordPromptEvent({
      event: "prompt_shown",
      surface,
      ...(resolvedKind ? { kind: resolvedKind } : {}),
      used: resolvedUsed,
      cap: resolvedCap,
    });
  }, [
    surface,
    resolvedKind,
    resolvedUsed,
    resolvedCap,
    isFirstPass,
    score,
    prompt.dismissedToday,
  ]);

  if (isFirstPass && score < 50) return null;
  if (dismissed) return null;
  if (prompt.dismissedToday) return null;

  if (usageLoading || plansLoading) return <UpgradePromptSkeleton />;

  const showFull = prompt.showFull;
  const weekly = tierByKey(tiers, "WEEKLY");
  const semester = tierByKey(tiers, "PRO");
  const weeklyPrice = weekly?.priceXaf ?? 500;
  const semesterPrice = semester?.priceXaf ?? 3000;
  const weeklyTip = weekly?.limits.aiTutorMessages ?? 50;
  const semesterTip = semester?.limits.aiTutorMessages ?? 200;
  const weeklyQuiz = weekly?.limits.quizGenerations ?? 20;
  const semesterQuiz = semester?.limits.quizGenerations ?? 300;

  const surfaceLabel = surface === "quiz" ? "quizzes" : "Tip messages";
  const paidAdds =
    surface === "quiz"
      ? `Weekly adds ${weeklyQuiz} quizzes, Semester adds ${semesterQuiz}.`
      : `Weekly adds ${weeklyTip} Tip a day, Semester adds ${semesterTip}.`;

  const record = (event: PromptEventName) => {
    try {
      recordPromptEvent({
        event,
        surface,
        ...(resolvedKind ? { kind: resolvedKind } : {}),
        used: resolvedUsed,
        cap: resolvedCap,
      });
    } catch {
      setFailed(true);
    }
  };

  const handleDismiss = () => {
    record("prompt_dismissed");
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgradeClick = () => {
    record("prompt_clicked");
    recordPromptEvent({
      event: "upgrade_start",
      surface,
      ...(resolvedKind ? { kind: resolvedKind } : {}),
    });
  };

  if (!showFull) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3 text-sm">
        <p>
          {isFirstPass
            ? "Strong work. "
            : `You used ${resolvedUsed} of ${resolvedCap} ${surfaceLabel}. `}
          <Link
            href="/subscription"
            className="underline"
            onClick={handleUpgradeClick}
          >
            See the pass
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {isFirstPass
              ? "Strong work. Keep the run going."
              : "You hit the free cap."}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFirstPass
              ? `${paidAdds} Free stays at 5 notes plus 10 quizzes plus 15 Tip a day.`
              : `You used ${resolvedUsed} of ${resolvedCap} free ${surfaceLabel} today. ${paidAdds}`}{" "}
            Weekly is {weeklyPrice.toLocaleString()} XAF, Semester is{" "}
            {semesterPrice.toLocaleString()} XAF. MTN Mobile Money first, Orange
            Money always present.
          </p>
          {plansError || failed ? (
            <p className="text-xs text-muted-foreground">
              Prices may be from the saved offer. Payment waits for a fresh
              read.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button asChild onClick={handleUpgradeClick}>
            <Link href="/subscription">See the Semester Pass</Link>
          </Button>
          <Button variant="ghost" onClick={handleDismiss}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
