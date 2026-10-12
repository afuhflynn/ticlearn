"use client";

import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LS_KEY = "onboarding-banner-dismissed-at";
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function isDismissedWithinCooldown(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(LS_KEY);
  if (!stored) return false;
  const dismissedAt = parseInt(stored, 10);
  if (isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < COOLDOWN_MS;
}

function markDismissed(): void {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {}
}

export function OnboardingBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(isDismissedWithinCooldown());
  const [needsAssessment, setNeedsAssessment] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/readiness")
      .then((r) => r.json())
      .then((d) => setNeedsAssessment(d.needsAssessment === true))
      .catch(() => setNeedsAssessment(false));
  }, []);

  if (dismissed || needsAssessment === null) return null;
  if (!needsAssessment) return null;

  const handleDismiss = () => {
    markDismissed();
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-medium text-amber-800">Your profile is incomplete</p>
        <p className="mt-1 text-amber-700">
          You skipped the setup process. Complete it to unlock personalised
          study plans, topic recommendations, and readiness tracking.
        </p>
        <button
          onClick={() => router.push("/onboarding")}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          Complete Setup <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
