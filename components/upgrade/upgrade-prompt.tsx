"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const KEY = "ticlearn-upgrade-prompt-date";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UpgradePrompt({ score }: { score: number }) {
  const [visible, setVisible] = useState(false);
  const [gains, setGains] = useState<string | null>(null);

  useEffect(() => {
    if (score < 50) return;
    try {
      if (localStorage.getItem(KEY) === today()) return;
    } catch {
      return;
    }
    let cancelled = false;
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.tiers) return;
        const weekly = data.tiers.find(
          (t: { key: string }) => t.key === "WEEKLY",
        );
        const pro = data.tiers.find((t: { key: string }) => t.key === "PRO");
        const w = weekly
          ? `${weekly.limits.quizGenerations} quizzes plus ${weekly.limits.aiTutorMessages} Tip a day`
          : null;
        const s = pro
          ? `${pro.limits.quizGenerations} quizzes plus ${pro.limits.aiTutorMessages} Tip a day`
          : null;
        setGains(
          [w && `Weekly adds ${w}`, s && `Semester adds ${s}`]
            .filter(Boolean)
            .join(". "),
        );
        setVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [score]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, today());
    } catch {}
    setVisible(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Strong work. Keep the run going.</p>
          <p className="text-sm text-muted-foreground">
            {gains ?? "A pass lifts your daily counts."} Free stays at 5 notes
            plus 10 quizzes plus 15 Tip a day.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/pricing">See weekly and semester</Link>
          </Button>
          <Button variant="outline" onClick={dismiss}>
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
