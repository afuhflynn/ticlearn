"use client";

import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/lib/auth-client";
import { AdminSettingsSkeleton } from "../admin-skeleton";

type PlatformSettings = {
  creditCostQuizGeneration: number;
  creditCostPracticeQuestion: number;
  creditCostRevisionGuideView: number;
  creditCostRevisionGuideGen: number;
  creditCostAiTutorMessage: number;
  creditCostMultiplierStarter: number;
  creditCostMultiplierStandard: number;
  creditCostMultiplierPremium: number;
  creditCostMultiplierPro: number;
  enforceCreditsAll: boolean;
  enforceCreditsForPractice: boolean;
  enforceCreditsForRevisionGuides: boolean;
  enforceCreditsForAiTutor: boolean;
  creditsPer1000Xaf: number;
  minCreditPurchaseXaf: number;
  maxCreditPurchaseXaf: number;
};

export default function AdminPlatformSettingsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [defaults, setDefaults] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/platform-settings");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) {
          setSettings(data.settings as PlatformSettings);
          setDefaults(data.defaults as PlatformSettings);
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not load platform settings",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<PlatformSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data.settings as PlatformSettings);
      toast.success("Platform settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loading) {
    return <AdminSettingsSkeleton fields={6} />;
  }

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }

  if (!settings) {
    return (
      <p className="text-muted-foreground">No platform settings loaded.</p>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SlidersHorizontal className="h-8 w-8 text-primary" />
          Platform & credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure pay-as-you-go credit pricing, per-feature costs, and when
          users must spend credits. Enforcement defaults are on for quizzes and
          AI tutor messages; revision guides stay optional until you enable
          them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay-as-you-go (Fapshi)</CardTitle>
          <CardDescription>
            Students buy credits with Mobile Money;{" "}
            <code className="text-xs">
              credits = floor(amountXaf × creditsPer1000Xaf / 1000)
            </code>
            . Fapshi minimum charge is 100 XAF.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Credits per 1,000 XAF</Label>
            <Input
              type="number"
              min={1}
              value={settings.creditsPer1000Xaf}
              onChange={(e) =>
                update({ creditsPer1000Xaf: Number(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Default: {defaults?.creditsPer1000Xaf ?? "—"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Min purchase (XAF)</Label>
            <Input
              type="number"
              min={100}
              value={settings.minCreditPurchaseXaf}
              onChange={(e) =>
                update({ minCreditPurchaseXaf: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max purchase (XAF)</Label>
            <Input
              type="number"
              min={100}
              value={settings.maxCreditPurchaseXaf}
              onChange={(e) =>
                update({ maxCreditPurchaseXaf: Number(e.target.value) || 0 })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enforcement</CardTitle>
          <CardDescription>
            When enabled, users need enough credits for the feature. “Enforce
            all” is equivalent to turning on every category below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Enforce all credit gates</p>
              <p className="text-sm text-muted-foreground">
                Same as enabling mocks, practice (quizzes + Paper 1/2 mock
                builds), revision guides, and AI tutor enforcement at once.
              </p>
            </div>
            <Switch
              checked={settings.enforceCreditsAll}
              onCheckedChange={(v) => update({ enforceCreditsAll: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Practice</span>
            <Switch
              checked={settings.enforceCreditsForPractice}
              onCheckedChange={(v) => update({ enforceCreditsForPractice: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">Revision guides</span>
            <Switch
              checked={settings.enforceCreditsForRevisionGuides}
              onCheckedChange={(v) =>
                update({ enforceCreditsForRevisionGuides: v })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">AI tutor</span>
            <Switch
              checked={settings.enforceCreditsForAiTutor}
              onCheckedChange={(v) => update({ enforceCreditsForAiTutor: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit costs (per action)</CardTitle>
          <CardDescription>
            Amount debited when enforcement applies. Set to 0 to allow unlimited
            for that line item while other gates are on.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["creditCostQuizGeneration", "Quiz generation"],
              ["creditCostPracticeQuestion", "Practice — per question"],
              ["creditCostRevisionGuideView", "Revision guide — view"],
              ["creditCostRevisionGuideGen", "Revision guide — generate"],
              ["creditCostAiTutorMessage", "AI tutor — per message"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                min={0}
                value={settings[key]}
                onChange={(e) =>
                  update({
                    [key]: Number(e.target.value) || 0,
                  } as Partial<PlatformSettings>)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tier credit cost multipliers</CardTitle>
          <CardDescription>
            Applied on top of per-action costs. Subscribers pay
            <code className="text-xs mx-1">ceil(baseCost × multiplier)</code>.
            FREE (no subscription) always pays 1.0×.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["creditCostMultiplierStarter", "STARTER"],
              ["creditCostMultiplierStandard", "STANDARD"],
              ["creditCostMultiplierPremium", "PREMIUM"],
              ["creditCostMultiplierPro", "PRO"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label} multiplier</Label>
              <Input
                type="number"
                min={0.01}
                max={5}
                step={0.05}
                value={settings[key]}
                onChange={(e) =>
                  update({
                    [key]: Number(e.target.value) || 0,
                  } as Partial<PlatformSettings>)
                }
              />
              <p className="text-xs text-muted-foreground">
                Default: {defaults?.[key] ?? "—"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save changes
      </Button>
    </div>
  );
}
