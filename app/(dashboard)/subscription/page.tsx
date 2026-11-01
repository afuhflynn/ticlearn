"use client";

import {
  Check,
  CreditCard,
  Loader2,
  MessageSquare,
  NotebookPen,
  Smartphone,
  Sparkles,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";
import { planCatalog, publicPlans } from "@/constants/plans";
import { useCredits, usePlans, useUsage } from "@/hooks";
import { api } from "@/lib/api-client";
import {
  CREDIT_MAX_XAF,
  CREDIT_MIN_XAF,
  CREDIT_STEP_XAF,
  creditsForXaf,
  MOMO_PROVIDERS,
} from "@/lib/mobile-money";
import { subscriptionViewParsers } from "@/nuqs/subscription";
import { SubscriptionSkeleton } from "../student-skeletons";

interface PaymentSettings {
  mtnNumber: string | null;
  mtnHolderName: string | null;
  orangeNumber: string | null;
  orangeHolderName: string | null;
}

function planLabel(plan: string): string {
  return planCatalog[plan]?.label ?? (plan === "FREE" ? "Free" : plan);
}

function periodLabel(plan: string): string {
  const def = planCatalog[plan];
  if (!def || def.period === "forever") return "";
  if (def.period === "semester") return "per semester";
  if (def.period === "week") return "per week";
  return "per month";
}

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

  if (!transId) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Transaction id: <span className="tabular-nums">{transId}</span>
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
    refetch,
  } = useUsage();
  const { data: creditsData } = useCredits();
  const { tiers: resolvedTiers } = usePlans();
  const router = useRouter();

  const [view, setView] = useQueryStates(
    { modal: subscriptionViewParsers.modal },
    { history: "push" },
  );

  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualPlan, setManualPlan] = useState("PRO");
  const [paymentMethod, setPaymentMethod] = useState("MTN");
  const [transactionId, setTransactionId] = useState("");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState<string>("MTN");
  const [creditAmount, setCreditAmount] = useState("1000");
  const [creditPhone, setCreditPhone] = useState("");
  const [creditProvider, setCreditProvider] = useState<string>("MTN");
  const [isCreditSubmitting, setIsCreditSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment-settings")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setPaymentSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A student who paid through a bank or a friend may have left the app.
  // The old flow returned here with a transaction id; that URL is still
  // cleaned up so a stale query string never sticks to the page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("creditPurchase") !== "return") return;
    window.history.replaceState(
      {},
      "",
      window.location.pathname + window.location.hash,
    );
  }, []);

  const handleUpgrade = async (selectedPlan: string) => {
    if (!momoPhone.trim()) {
      toast.error("Enter the phone number that will approve the PIN.");
      return;
    }
    setIsSubmitting(true);
    try {
      const fresh = await api.queries.plans().catch(() => null);
      if (!fresh) {
        toast.error("The offer did not load. Check connection then retry.");
        return;
      }
      const data = await api.mutations.payments.initiatePass({
        plan: selectedPlan,
        phone: momoPhone.trim(),
        provider: momoProvider,
      });
      if (data.link) {
        window.location.href = data.link;
      } else {
        toast.error("The payment link was not generated. Please try again.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start the payment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const creditAmountNumber = Number.parseInt(creditAmount, 10);
  const creditPreview = Number.isInteger(creditAmountNumber)
    ? creditsForXaf(creditAmountNumber)
    : 0;

  const handleCreditBuy = async () => {
    if (!creditPhone.trim()) {
      toast.error("Enter the phone number that will approve the PIN.");
      return;
    }
    setIsCreditSubmitting(true);
    try {
      const data = await api.mutations.payments.initiateCredits({
        amountXaf: creditAmountNumber,
        phone: creditPhone.trim(),
        provider: creditProvider,
      });
      if (data.link) {
        window.location.href = data.link;
      } else {
        toast.error("The payment link was not generated. Please try again.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start the payment",
      );
    } finally {
      setIsCreditSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!transactionId.trim()) {
      toast.error("Enter the transaction ID from your SMS");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/subscription/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: manualPlan,
          transactionId: transactionId.trim(),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not submit the payment");
      }
      toast.success(
        "Sent for review. You will get an email once it is checked.",
      );
      setTransactionId("");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit the payment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SubscriptionSkeleton />;
  }

  const balance = creditsData?.balance ?? 0;
  const definition = planCatalog[plan] ?? planCatalog.FREE;
  const isFree = plan === "FREE";
  const hasStatus = status !== "NONE";
  const manualPlans = publicPlans.filter((p) => p.key !== "FREE");
  const offerTiers =
    resolvedTiers.length > 0
      ? resolvedTiers.filter((t) => ["FREE", "WEEKLY", "PRO"].includes(t.key))
      : publicPlans.map((p) => ({
          key: p.key,
          label: p.label,
          priceXaf: p.priceXaf,
          features: p.features,
          popular: p.popular ?? false,
          cta: p.cta,
        }));
  const hasManualNumbers =
    Boolean(paymentSettings?.mtnNumber) ||
    Boolean(paymentSettings?.orangeNumber);

  return (
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
        <Button className="gap-2" onClick={() => setView({ modal: "upgrade" })}>
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
                  {planLabel(plan)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isFree
                    ? "No payment needed."
                    : `${definition.priceXaf.toLocaleString()} FCFA ${periodLabel(plan)}`}
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
                <p className="text-sm font-medium">Payment not finished yet</p>
                <p className="text-sm text-muted-foreground">
                  Finish the payment on your phone, then come back to this page.
                  Nothing is charged twice.
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
                The Semester Pass adds 15,000 credits with 100 notes plus 300
                quizzes plus 200 Tip messages a day.
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
              : `Your plan runs for the ${periodLabel(plan).replace("per ", "")}. It does not renew by itself.`}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5 text-primary" />
            Top up credits
          </CardTitle>
          <CardDescription>
            Type an amount from {CREDIT_MIN_XAF.toLocaleString()} XAF to{" "}
            {CREDIT_MAX_XAF.toLocaleString()} XAF in {CREDIT_STEP_XAF} XAF
            steps. Every 1 XAF gives 5 credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount (XAF)</Label>
              <Input
                id="credit-amount"
                inputMode="numeric"
                placeholder="1000"
                value={creditAmount}
                onChange={(event) => setCreditAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-provider">Mobile Money</Label>
              <Select value={creditProvider} onValueChange={setCreditProvider}>
                <SelectTrigger id="credit-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOMO_PROVIDERS.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-phone">Phone number</Label>
              <Input
                id="credit-phone"
                inputMode="tel"
                placeholder="6XXXXXXXX"
                value={creditPhone}
                onChange={(event) => setCreditPhone(event.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {Number.isInteger(creditAmountNumber) &&
            creditAmountNumber >= CREDIT_MIN_XAF &&
            creditAmountNumber <= CREDIT_MAX_XAF
              ? `${creditAmountNumber.toLocaleString()} XAF gives ${creditPreview.toLocaleString()} credits.`
              : `Type ${CREDIT_MIN_XAF.toLocaleString()} to ${CREDIT_MAX_XAF.toLocaleString()} XAF.`}
          </p>
          <Button
            onClick={handleCreditBuy}
            disabled={isCreditSubmitting || !creditPhone.trim()}
          >
            {isCreditSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Starting
              </>
            ) : (
              "Buy credits with Mobile Money"
            )}
          </Button>
        </CardContent>
      </Card>

      {hasManualNumbers ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              Paid by Mobile Money already?
            </CardTitle>
            <CardDescription>
              Send the amount to one of these numbers, then put the transaction
              ID from your SMS here. We check it and turn the plan on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentSettings?.mtnNumber ? (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    MTN Mobile Money
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-wide">
                    {paymentSettings.mtnNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paymentSettings.mtnHolderName || "TiCLearn"}
                  </p>
                </div>
              ) : null}
              {paymentSettings?.orangeNumber ? (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Orange Money
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-wide">
                    {paymentSettings.orangeNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paymentSettings.orangeHolderName || "TiCLearn"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manual-plan">Plan</Label>
                <Select value={manualPlan} onValueChange={setManualPlan}>
                  <SelectTrigger id="manual-plan" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {manualPlans.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label} · {option.priceXaf.toLocaleString()} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-method">Paid with</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="manual-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                    <SelectItem value="ORANGE">Orange Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-transaction">Transaction ID</Label>
              <Input
                id="manual-transaction"
                placeholder="The ID in the SMS you received"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
              />
            </div>

            <Button
              onClick={handleManualSubmit}
              disabled={isSubmitting || !transactionId.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending
                </>
              ) : (
                "Send for review"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
              The Semester Pass is paid once and does not renew by itself. Both
              options keep your notes and quizzes. Amounts come from the plan
              buttons, never typed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="momo-provider">Mobile Money</Label>
              <Select value={momoProvider} onValueChange={setMomoProvider}>
                <SelectTrigger id="momo-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOMO_PROVIDERS.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="momo-phone">Phone number</Label>
              <Input
                id="momo-phone"
                inputMode="tel"
                placeholder="6XXXXXXXX"
                value={momoPhone}
                onChange={(event) => setMomoPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {offerTiers.map((option) => {
              const isCurrent = plan === option.key && status === "ACTIVE";
              const isFreeOption = option.key === "FREE";
              return (
                <div
                  key={option.key}
                  className={`flex flex-col rounded-xl border p-5 ${
                    option.popular ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{option.label}</p>
                    {option.popular ? (
                      <Badge variant="secondary">One semester</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    {option.priceXaf.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      FCFA {periodLabel(option.key) || "forever"}
                    </span>
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {option.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={isFreeOption ? "outline" : "default"}
                    disabled={isCurrent || isSubmitting || isFreeOption}
                    onClick={() => {
                      if (isFreeOption) {
                        setView({ modal: "" }, { history: "replace" });
                        router.push("/upload");
                      } else {
                        void handleUpgrade(option.key);
                      }
                    }}
                  >
                    {isCurrent
                      ? "Current plan"
                      : isFreeOption
                        ? "Included"
                        : paymentPending
                          ? "Finish payment"
                          : option.cta}
                  </Button>
                </div>
              );
            })}
          </div>

          {hasManualNumbers ? (
            <p className="text-center text-xs text-muted-foreground">
              Already paid? Close this and use the Mobile Money card below.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
