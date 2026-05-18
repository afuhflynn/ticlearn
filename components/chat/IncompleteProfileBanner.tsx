"use client";

import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function IncompleteProfileBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [needsAssessment, setNeedsAssessment] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/readiness")
      .then((r) => r.json())
      .then((d) => setNeedsAssessment(d.needsAssessment === true))
      .catch(() => setNeedsAssessment(false));
  }, []);

  if (dismissed || needsAssessment === null) return null;
  if (!needsAssessment) return null;

  return (
    <div className="mx-4 mt-2 flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-3 text-xs">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="flex-1">
        <p className="font-medium text-blue-800">
          Limited AI context
        </p>
        <p className="mt-0.5 text-blue-700">
          Complete your profile to give the AI your subjects, exam date, and
          study data for better answers.
        </p>
        <button
          onClick={() => router.push("/onboarding")}
          className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          Set Up Profile <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-lg p-1 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
