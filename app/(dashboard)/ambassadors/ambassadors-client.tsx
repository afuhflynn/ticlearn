"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AMBASSADOR_COPY,
  ambassadorWhatsAppUrl,
} from "@/constants/ambassador-copy";

type Me = {
  code: string;
  link: string;
  qualified: number;
  pending: number;
  remaining: number;
  threshold: number;
};

type Row = {
  id: string;
  status: string;
  qualifiedAt: string | null;
  expiresAt: string;
  display: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "QUALIFIED":
      return "Counted";
    case "REWARDED":
      return "Rewarded";
    case "EXPIRED":
      return "Expired";
    case "FLAGGED":
      return "Under review";
    default:
      return "Pending";
  }
}

export default function AmbassadorsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Bind a pending cookie first, so Google signups attribute too.
        await fetch("/api/ambassadors/attach", { method: "POST" }).catch(
          () => {},
        );
        const [meRes, progRes] = await Promise.all([
          fetch("/api/ambassadors/me"),
          fetch("/api/ambassadors/progress?page=1"),
        ]);
        if (!meRes.ok) throw new Error("Could not load your invite link.");
        const meJson = (await meRes.json()) as Me;
        const progJson = (await progRes.json()) as { rows?: Row[] };
        if (!cancelled) {
          setMe(meJson);
          setRows(progJson.rows ?? []);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="rounded-xl border p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Campus ambassadors</h1>
        <p className="text-sm text-muted-foreground">
          {error ?? "Could not load."}
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const percent = Math.min(
    100,
    Math.round((me.qualified / me.threshold) * 100),
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(me.link);
      toast.success("Link copied. Share it on WhatsApp.");
    } catch {
      toast.error("Could not copy. Long press the link to copy it.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {AMBASSADOR_COPY.headline}
        </h1>
        <p className="text-muted-foreground">{AMBASSADOR_COPY.subhead}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your invite</CardTitle>
          <CardDescription>
            {me.qualified} of {me.threshold} friends counted
            {me.pending > 0 ? ` · ${me.pending} pending` : ""}.{" "}
            {AMBASSADOR_COPY.remaining(me.remaining)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percent} className="h-2" />
          <div className="space-y-2">
            <Label htmlFor="amb-link">{AMBASSADOR_COPY.linkLabel}</Label>
            <Input id="amb-link" readOnly value={me.link} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amb-code">{AMBASSADOR_COPY.codeLabel}</Label>
            <Input
              id="amb-code"
              readOnly
              value={me.code}
              className="uppercase"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a
                href={ambassadorWhatsAppUrl(me.link)}
                target="_blank"
                rel="noreferrer"
              >
                {AMBASSADOR_COPY.cta}
              </a>
            </Button>
            <Button variant="outline" onClick={copyLink}>
              Copy link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {AMBASSADOR_COPY.finePrint}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
          <CardDescription>
            A friend counts after verified email plus a paid pass or credits.
            Pending invites expire after 180 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invites yet. Share your link and your friends will appear here.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{r.display}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "PENDING"
                        ? `Expires ${new Date(r.expiresAt).toLocaleDateString()}`
                        : r.qualifiedAt
                          ? `Counted ${new Date(r.qualifiedAt).toLocaleDateString()}`
                          : statusLabel(r.status)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.status === "QUALIFIED" || r.status === "REWARDED"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {statusLabel(r.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
