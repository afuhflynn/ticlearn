"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Tier {
  key: string;
  label: string;
  priceXaf: number;
  limits: {
    pdfUploads: number;
    quizGenerations: number;
    aiTutorMessages: number;
    maxConversationMessages: number;
  };
}

interface Audit {
  id: string;
  planKey: string;
  actorId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export default function AdminPlansPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.resolved) setTiers(data.resolved);
        if (data?.audits) setAudits(data.audits);
      })
      .catch(() => {});
  }, []);

  const value = (key: string, field: string, fallback: number) =>
    editing[`${key}.${field}`] ?? String(fallback);

  const save = async (tier: Tier) => {
    setSaving(tier.key);
    try {
      const num = (field: string, fallback: number) => {
        const raw = value(tier.key, field, fallback).trim();
        const n = Number(raw);
        if (!Number.isInteger(n))
          throw new Error(`${field} must be a whole number`);
        return n;
      };
      const priceXaf = num("priceXaf", tier.priceXaf);
      if (priceXaf < 100 || priceXaf > 20000 || priceXaf % 50 !== 0)
        throw new Error("Price must be 100 to 20000 in round 50 steps");
      const limits = {
        pdfUploads: num("pdfUploads", tier.limits.pdfUploads),
        quizGenerations: num("quizGenerations", tier.limits.quizGenerations),
        aiTutorMessages: num("aiTutorMessages", tier.limits.aiTutorMessages),
        maxConversationMessages: num(
          "maxConversationMessages",
          tier.limits.maxConversationMessages,
        ),
      };
      for (const [k, v] of Object.entries(limits)) {
        if (v < 0 || v > 1000) throw new Error(`${k} must be 0 to 1000`);
      }
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: tier.key, priceXaf, limits }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Save failed");
      if (data?.resolved)
        setTiers((prev) =>
          prev.map((t) => (t.key === tier.key ? data.resolved : t)),
        );
      setEditing((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next))
          if (k.startsWith(`${tier.key}.`)) delete next[k];
        return next;
      });
      const refreshed = await fetch("/api/admin/plans").then((r) =>
        r.ok ? r.json() : null,
      );
      if (refreshed?.audits) setAudits(refreshed.audits);
      toast.success(`Saved ${tier.key}. Applies to the next purchase only.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the plan",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
        <p className="text-muted-foreground">
          Prices and counts. Overrides apply to the next purchase only, never
          mid cycle. Every save is audited.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {tiers.map((tier) => (
          <Card key={tier.key}>
            <CardHeader>
              <CardTitle>
                {tier.label} · {tier.key}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["priceXaf", "Price XAF"],
                  ["pdfUploads", "Notes"],
                  ["quizGenerations", "Quizzes"],
                  ["aiTutorMessages", "Tip messages a day"],
                  ["maxConversationMessages", "Max thread length"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={`${tier.key}-${field}`}>{label}</Label>
                  <Input
                    id={`${tier.key}-${field}`}
                    inputMode="numeric"
                    value={value(
                      tier.key,
                      field,
                      field === "priceXaf"
                        ? tier.priceXaf
                        : tier.limits[field as keyof Tier["limits"]],
                    )}
                    onChange={(event) =>
                      setEditing((prev) => ({
                        ...prev,
                        [`${tier.key}.${field}`]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <Button
                className="w-full"
                disabled={saving === tier.key}
                onClick={() => save(tier)}
              >
                {saving === tier.key ? "Saving" : "Save override"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overrides yet. The file catalogue is live.
            </p>
          ) : (
            audits.slice(0, 20).map((audit) => (
              <div key={audit.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{audit.planKey}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(audit.createdAt).toLocaleString()} · {audit.actorId}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
