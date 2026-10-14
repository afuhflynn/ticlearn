"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LEVELS } from "@/constants/levels";
import { useSession } from "@/lib/auth-client";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: selected }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save");
      }

      router.push("/upload");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step 1 of 1
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full rounded-full bg-primary" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Which year are you in?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            That is all we need. Tip uses it to explain things at the right
            depth.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setSelected(level.value)}
              disabled={saving}
              aria-pressed={selected === level.value}
              className={`w-full rounded-xl border-2 p-5 text-left transition-all hover:border-primary active:scale-[0.98] ${
                selected === level.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-base font-semibold">{level.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {level.blurb}
              </p>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
