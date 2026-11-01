"use client";

import {
  Check,
  Copy,
  CreditCard,
  Loader2,
  MessageSquare,
  NotebookPen,
  Sparkles,
  Upload,
} from "lucide-react";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PendingRegion } from "@/components/ui/pending-region";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";
import { planCatalog, publicPlans } from "@/constants/plans";
import { useCredits, useUsage } from "@/hooks";
import { api } from "@/lib/api-client";
import { periodLabelForPlan } from "@/lib/plans-display";
import { subscriptionViewParsers } from "@/nuqs/subscription";
import { SubscriptionSkeleton } from "../student-skeletons";

function spendLine(limit: number, used: string | number): string {
  return `${used} of ${limit}`;
}

function percent(limit: number, used: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function PaidReceipt() {
  const [receipt, setReceipt] = useState<{
    plan: string;
    amount: number;
    transId: string | null;
    paidAt: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.queries
      .subscription()
      .then((data) => {
        if (cancelled || !data?.subscription) return;
        const full = data.subscription as typeof data.subscription & {
          amount?: number;
          fapshiTransId?: string | null;
        };
        setReceipt({
          plan: full.plan,
          amount: full.amount ?? 0,
          transId: full.fapshiTransId ?? null,
          paidAt: full.activatedAt ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!receipt) return null;
  let paidLabel: string | null = null;
  if (receipt.paidAt) {
    try {
      paidLabel = new Date(receipt.paidAt).toLocaleDateString("en-GB", {
        timeZone: "Africa/Douala",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      paidLabel = new Date(receipt.paidAt).toLocaleDateString();
    }
  }
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium">Receipt</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {planCatalog[receipt.plan]?.label ?? receipt.plan} ·{" "}
        {receipt.amount.toLocaleString()} FCFA
        {paidLabel ? ` · paid ${paidLabel}` : ""}
      </p>
      {receipt.transId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Transaction id:{" "}
          <span className="tabular-nums">{receipt.transId}</span> · keep it for
          support.
        </p>
      ) : null}
    </div>
  );
}

const MAX_RECHECK_ATTEMPTS = 60;

function PendingRecheck() {
  const [transId, setTransId] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const done = attempts >= MAX_RECHECK_ATTEMPTS;

  useEffect(() => {
    let cancelled = false;
    api.queries
      .subscription()
      .then((data) => {
        if (cancelled) return;
        const full = data?.subscription as
          | (typeof data.subscription & { fapshiTransId?: string | null })
          | null
          | undefined;
        if (full?.fapshiTransId) setTransId(full.fapshiTransId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!transId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      setAttempts((n) => {
        if (n >= MAX_RECHECK_ATTEMPTS) return n;
        return n + 1;
      });
      try {
        const data = await api.queries.payments.status(transId);
        if (stopped) return;
        if (data?.status === "ACTIVE") {
          window.location.reload();
          return;
        }
        if (data?.providerStatus)
          setLabel(`Phone provider says: ${data.providerStatus}.`);
      } catch {}
      if (!stopped) {
        setAttempts((n) => {
          if (n < MAX_RECHECK_ATTEMPTS) {
            timer = setTimeout(tick, 5000);
          } else {
            setLabel(
              "Still pending after 5 minutes. Contact support with the transaction id below.",
            );
          }
          return n;
        });
      }
    };
    timer = setTimeout(tick, 5000);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [transId]);

  const handleRecheck = async () => {
    if (!transId || checking || done) return;
    setChecking(true);
    try {
      const data = await api.queries.payments.status(transId);
      if (data?.status === "ACTIVE") {
        window.location.reload();
        return;
      }
      setAttempts((n) => Math.min(n + 1, MAX_RECHECK_ATTEMPTS));
      if (data?.providerStatus)
        setLabel(`Phone provider says: ${data.providerStatus}.`);
    } catch {
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = async () => {
    if (!transId) return;
    try {
      await navigator.clipboard.writeText(transId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!transId) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Transaction id: <span className="tabular-nums">{transId}</span>
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          onClick={handleCopy}
        >
          <Copy className="size-3" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </p>
      <div className="space-y-1">
        <Progress
          value={Math.min(
            100,
            Math.round((attempts / MAX_RECHECK_ATTEMPTS) * 100),
          )}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground tabular-nums">
          Recheck {Math.min(attempts, MAX_RECHECK_ATTEMPTS)} of{" "}
          {MAX_RECHECK_ATTEMPTS}
        </p>
      </div>
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Still waiting on the phone prompt. Finish the PIN on your phone, then
          press Recheck. The wait is normal.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRecheck}
          disabled={checking || done}
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Rechecking
            </>
          ) : (
            "Recheck now"
          )}
        </Button>
        {done ? (
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline"
          >
            Ask for help with this id
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const {
    plan,
    status,
    limits,
    usage,
    creditCosts,
    isPending: paymentPending,
    isLoading,
    isFetching,
    refetch,
  } = useUsage();
  const { data: creditsData } = useCredits();

  const [view, setView] = useQueryStates(
    { modal: subscriptionViewParsers.modal },
    { history: "push" },
  );

  const balance = creditsData?.balance ?? 0;
  const definition = planCatalog[plan] ?? planCatalog.FREE;
  const isFree = plan === "FREE";
  const hasStatus = status !== "NONE";
  const semesterCredits = planCatalog.PRO.credits.toLocaleString();

  return (
    <PendingRegion
      fallback={<SubscriptionSkeleton />}
      isPending={isLoading}
      isRefreshing={!isLoading && isFetching}
      label="Plan and credits"
      longWaitMessage="Reading your plan. This usually takes a few seconds."
      onRetry={() => refetch()}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Plan &amp; credits
            </h1>
            <p className="text-muted-foreground">
              What your plan includes, what you have used, and what is left.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => setView({ modal: "upgrade" })}
          >
            <CreditCard className="size-4" />
            {isFree ? "See the Semester Pass" : "Change plan"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Your plan</CardTitle>
                  <CardDescription>
                    {hasStatus
                      ? "The plan attached to this account."
                      : "No paid plan yet. The free limits still apply."}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    status === "ACTIVE"
                      ? "default"
                      : status === "PENDING"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {status === "NONE" ? "Free" : status.toLowerCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    {definition.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isFree
                      ? "No payment needed."
                      : `${definition.priceXaf.toLocaleString()} FCFA ${periodLabelForPlan(definition)}`}
                  </p>
                </div>
                {isFree ? (
                  <Button
                    variant="outline"
                    onClick={() => setView({ modal: "upgrade" })}
                  >
                    <Sparkles className="mr-2 size-4" />
                    What the pass adds
                  </Button>
                ) : null}
              </div>

              {paymentPending ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-medium">
                    Payment not finished yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Finish the payment on your phone, then come back to this
                    page. Nothing is charged twice.
                  </p>
                  <PendingRecheck />
                </div>
              ) : null}

              {status === "ACTIVE" ? <PaidReceipt /> : null}

              <Separator />

              <ul className="grid gap-3 sm:grid-cols-2">
                {definition.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
              <CardDescription>
                Used for quizzes and Tip, and included with your plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-4xl font-bold tabular-nums">
                  {balance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">credits left</p>
              </div>

              <Separator />

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <NotebookPen className="size-4" />A quiz
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {creditCosts.quizGeneration} credits
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="size-4" />A Tip message
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {creditCosts.aiTutorMessage} credits
                  </dd>
                </div>
              </dl>

              {isFree ? (
                <p className="text-xs text-muted-foreground">
                  The Semester Pass adds {semesterCredits} credits with 100
                  notes plus 300 quizzes plus 200 Tip messages a day.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              {isFree
                ? "Free limits. They are checked each time you upload or generate."
                : "Your plan limits. Tip messages reset every day at Africa/Douala midnight."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="size-4 text-muted-foreground" />
                  Notes
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {spendLine(limits.pdfUploads, usage.pdfUploads)}
                </span>
              </div>
              <Progress
                value={percent(limits.pdfUploads, usage.pdfUploads)}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <NotebookPen className="size-4 text-muted-foreground" />
                  Quizzes generated
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {spendLine(limits.quizGenerations, usage.quizGenerations)}
                </span>
              </div>
              <Progress
                value={percent(limits.quizGenerations, usage.quizGenerations)}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  Tip messages today
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {spendLine(limits.aiTutorMessages, usage.aiTutorMessages)}
                </span>
              </div>
              <Progress
                value={percent(limits.aiTutorMessages, usage.aiTutorMessages)}
                className="h-2"
              />
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {isFree
                ? "Free allows 5 notes plus 10 quizzes plus 15 Tip messages a day. A Weekly Pass or the Semester Pass lifts each count."
                : `Your plan runs for the ${periodLabelForPlan(definition).replace("per ", "")}. It does not renew by itself.`}
            </p>
          </CardFooter>
        </Card>

        <Dialog
          open={view.modal === "upgrade"}
          onOpenChange={(open) => {
            if (open) setView({ modal: "upgrade" });
            else setView({ modal: "" }, { history: "replace" });
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Choose a plan</DialogTitle>
              <DialogDescription>
                The Semester Pass is paid once and does not renew by itself.
                Both options keep your notes and quizzes. Paid once over MTN
                Mobile Money or Orange Money.
              </DialogDescription>
            </DialogHeader>

            <PricingPlans plans={publicPlans} mode="app" />
          </DialogContent>
        </Dialog>
      </div>
    </PendingRegion>
  );
}
