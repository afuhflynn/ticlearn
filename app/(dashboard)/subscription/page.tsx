"use client";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Coins,
  CreditCard,
  History,
  ListTodo,
  Loader2,
  MessageSquare,
  Shield,
  Smartphone,
  Upload,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlan, useUsage } from "@/hooks";

const MONTHLY_CREDIT_BONUS: Record<string, number> = {
  STARTER: 400,
  STANDARD: 1_200,
  PREMIUM: 3_000,
};

const CREDIT_DISCOUNT: Record<string, string> = {
  STARTER: "20% off",
  STANDARD: "40% off",
  PREMIUM: "60% off",
};

const PLAN_FEATURES = {
  FREE: [
    "2 PDF Uploads",
    "4 Quiz Generations",
    "8 AI Tutor Messages / day",
    "Pay-per-use credits",
    "Standard Support",
  ],
  STARTER: [
    "10 PDF Uploads",
    "20 Quiz Generations",
    "50 AI Tutor Messages / day",
    "+400 free credits / month",
    "20% discount on all credit costs",
    "Community Access",
    "Leaderboard Participation",
    "Readiness tracking",
  ],
  STANDARD: [
    "30 PDF Uploads",
    "60 Quiz Generations",
    "Unlimited AI Tutor Messages",
    "+1,200 free credits / month",
    "40% discount on all credit costs",
    "Everything in Starter",
    "Priority Support",
  ],
  PREMIUM: [
    "Unlimited PDF Uploads",
    "Unlimited Quiz Generations",
    "Unlimited AI Tutor Messages",
    "+3,000 free credits / month",
    "60% discount on all credit costs",
    "Everything in Standard",
    "Early Access to Features",
  ],
};

const CREDIT_COST_EXAMPLES = [
  { action: "Quiz generation", baseCost: 50, icon: "ListTodo" },
  { action: "Mock exam build", baseCost: 40, icon: "FileText" },
  { action: "AI tutor message", baseCost: 5, icon: "MessageSquare" },
];

const PLAN_PRICES = {
  STARTER: 3000,
  STANDARD: 5000,
  PREMIUM: 10000,
};

interface PaymentSettings {
  mtnNumber: string | null;
  mtnHolderName: string | null;
  orangeNumber: string | null;
  orangeHolderName: string | null;
}

/** Subscription page: reconcile toast branches */
function creditReconcileLooksSynced(result?: {
  ok?: boolean;
  credited?: boolean;
  reason?: string;
}) {
  if (!result?.ok || result.credited) return false;
  const bad = ["order_still_pending", "transaction_failed"];
  return !bad.includes(result.reason ?? "");
}

export default function SubscriptionPage() {
  const {
    usage,
    limits,
    plan,
    status,
    previousPlan,
    isPending,
    chatDailyUsage,
    isLoading: usageLoading,
  } = useUsage();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [manualPlan, setManualPlan] = useState("STARTER");
  const [paymentMethod, setPaymentMethod] = useState("MTN");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [purchaseConfig, setPurchaseConfig] = useState<{
    creditsPer1000Xaf: number;
    minCreditPurchaseXaf: number;
    maxCreditPurchaseXaf: number;
    minXafEffective: number;
  } | null>(null);
  const [creditAmountXaf, setCreditAmountXaf] = useState(5_000);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);

  useEffect(() => {
    async function fetchPaymentSettings() {
      try {
        const response = await fetch("/api/payment-settings");
        const data = await response.json();
        setPaymentSettings(data);
      } catch (error) {
        console.error("Failed to fetch payment settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    fetchPaymentSettings();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/credits"),
          fetch("/api/credits/purchase/config"),
        ]);
        const creditsData = await cRes.json();
        const purchaseData = await pRes.json();
        if (!cancelled && cRes.ok) {
          setCreditBalance(creditsData.balance ?? 0);
        }
        if (!cancelled && pRes.ok) {
          setPurchaseConfig({
            creditsPer1000Xaf: purchaseData.creditsPer1000Xaf,
            minCreditPurchaseXaf: purchaseData.minCreditPurchaseXaf,
            maxCreditPurchaseXaf: purchaseData.maxCreditPurchaseXaf,
            minXafEffective: purchaseData.minXafEffective,
          });
          const def = Math.max(
            100,
            purchaseData.minXafEffective ?? purchaseData.minCreditPurchaseXaf,
          );
          setCreditAmountXaf(def);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("creditPurchase") !== "return") return;

    const transId = params.get("transId")?.trim() ?? "";
    const redirectStatus = params.get("status")?.trim().toUpperCase() ?? "";

    window.history.replaceState(
      {},
      "",
      window.location.pathname + window.location.hash,
    );

    void (async () => {
      const refreshBalance = async () => {
        try {
          const cRes = await fetch("/api/credits");
          const creditsData = await cRes.json();
          if (cRes.ok) setCreditBalance(creditsData.balance ?? 0);
        } catch {
          /* ignore */
        }
      };

      if (transId) {
        try {
          const res = await fetch("/api/credits/purchase/reconcile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transId,
              redirectHint:
                redirectStatus === "SUCCESSFUL"
                  ? "SUCCESSFUL"
                  : redirectStatus === "FAILED"
                    ? "FAILED"
                    : undefined,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            pendingReason?: string;
            softPending?: boolean;
            message?: string;
            result?: {
              ok?: boolean;
              credited?: boolean;
              reason?: string;
            };
            balance?: number;
            error?: string;
          };

          if (res.ok && data.pendingReason === "gateway_stale") {
            toast.message("Still confirming payment…", {
              description:
                data.message ||
                "The gateway is catching up—your credits usually appear within a minute. Balance refreshes below.",
            });
            await refreshBalance();
          } else if (res.ok && data.result?.credited) {
            toast.success("Credits added", {
              description: `Balance: ${Number(data.balance ?? 0).toLocaleString()} credits.`,
            });
            if (typeof data.balance === "number")
              setCreditBalance(data.balance);
          } else if (
            res.ok &&
            data.result?.ok &&
            creditReconcileLooksSynced(data.result)
          ) {
            toast.success("You're all set", {
              description: `Balance: ${Number(data.balance ?? 0).toLocaleString()} credits.`,
            });
            if (typeof data.balance === "number")
              setCreditBalance(data.balance);
          } else if (
            res.ok &&
            data.softPending === true &&
            data.result?.reason === "order_still_pending"
          ) {
            toast.message("Almost there…", {
              description:
                "Payment succeeded—finalizing credits. Refresh in a few seconds if the balance looks unchanged.",
            });
            await refreshBalance();
          } else if (
            res.ok &&
            redirectStatus === "SUCCESSFUL" &&
            !data.result?.ok
          ) {
            toast.message("Confirming payment…", {
              description:
                "Gateway responded but fulfillment is still pending—refresh in a moment or contact support if credits don't appear.",
            });
            await refreshBalance();
          } else if (!res.ok) {
            toast.message("Couldn't reach payment verifier", {
              description:
                redirectStatus === "SUCCESSFUL"
                  ? data.error ||
                    "Try refreshing this page in a minute. If credits still don't show, contact support with your transaction ID."
                  : "Finish checkout on your phone, or try again.",
            });
            await refreshBalance();
          } else {
            await refreshBalance();
          }
        } catch {
          toast.message("Payment complete?", {
            description:
              "If checkout finished on your phone, credits usually appear shortly—refresh if needed.",
          });
          await refreshBalance();
        }
      } else {
        toast.message("Payment complete?", {
          description:
            "If you finished Mobile Money checkout, your credits usually appear within a minute.",
        });
        await refreshBalance();
      }
    })();
  }, []);

  const estimatedCredits =
    purchaseConfig && creditAmountXaf > 0
      ? Math.floor((creditAmountXaf * purchaseConfig.creditsPer1000Xaf) / 1000)
      : 0;

  const handleBuyCredits = async () => {
    if (!purchaseConfig) {
      toast.error("Pricing not loaded yet");
      return;
    }
    const minXaf = purchaseConfig.minXafEffective;
    const maxXaf = purchaseConfig.maxCreditPurchaseXaf;
    if (creditAmountXaf < minXaf) {
      toast.error(`Minimum top-up is ${minXaf.toLocaleString()} XAF`);
      return;
    }
    if (creditAmountXaf > maxXaf) {
      toast.error(`Maximum top-up is ${maxXaf.toLocaleString()} XAF`);
      return;
    }
    if (estimatedCredits < 1) {
      toast.error("Amount too low for at least 1 credit at the current rate.");
      return;
    }

    setIsPurchasingCredits(true);
    try {
      const res = await fetch("/api/credits/purchase/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountXaf: creditAmountXaf }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not start payment");
      }
      if (data.link) {
        window.location.href = data.link as string;
      } else {
        toast.error("No payment link returned");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not start credit purchase",
      );
    } finally {
      setIsPurchasingCredits(false);
    }
  };

  const handleUpgrade = async (selectedPlan: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      if (data.link) {
        window.location.href = data.link;
      } else {
        toast.error("Payment link not generated");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initiate payment",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!transactionId.trim()) {
      toast.error("Please enter your transaction ID");
      return;
    }

    setIsSubmittingManual(true);
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
        throw new Error(data.error || "Failed to submit payment");
      }

      toast.success(
        "Payment submitted! Please wait for admin approval. Check your email for updates.",
      );
      setTransactionId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit payment",
      );
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (usageLoading || isLoadingSettings) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const hasPaymentNumbers =
    paymentSettings?.mtnNumber || paymentSettings?.orangeNumber;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Subscription & Usage
          </h1>
          <p className="text-muted-foreground">
            Manage your plan and credits, track usage, and upgrade for more
            features
          </p>
        </div>
        <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Zap className="h-4 w-4 fill-primary-foreground" />
              Upgrade Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl lg:min-w-5xl md:min-w-3xl max-h-[90vh] overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">
                Select a Plan
              </DialogTitle>
              <DialogDescription className="text-center">
                Choose the perfect plan to accelerate your learning journey
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-3 py-6">
              {Object.entries(PLAN_PRICES).map(([p, price]) => {
                const creditBonus = MONTHLY_CREDIT_BONUS[p] ?? 0;
                const discount = CREDIT_DISCOUNT[p] ?? "";
                return (
                  <Card
                    key={p}
                    className={
                      plan === p ? "border-primary ring-1 ring-primary" : ""
                    }
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {p}
                        {plan === p && <Badge>Current</Badge>}
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {price.toLocaleString()} XAF
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      {p !== "FREE" && (
                        <div className="mt-2 space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            +{creditBonus.toLocaleString()} credits/mo
                          </Badge>
                          <Badge variant="outline" className="text-xs ml-1">
                            {discount}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-2 text-sm">
                        {PLAN_FEATURES[p as keyof typeof PLAN_FEATURES].map(
                          (feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2"
                            >
                              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ),
                        )}
                      </ul>
                      {p === "FREE" && status !== "ACTIVE" && (
                        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                          <p className="font-medium mb-1">
                            What you miss without a plan:
                          </p>
                          <ul className="space-y-1 list-disc pl-4">
                            <li>You pay full credit prices (no discount)</li>
                            <li>No free monthly credits</li>
                            <li>Limited AI tutor (8/day vs unlimited)</li>
                            <li>No leaderboard or community access</li>
                          </ul>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={
                          plan === p && status === "ACTIVE"
                            ? "outline"
                            : "default"
                        }
                        disabled={
                          (plan === p && status === "ACTIVE") || isProcessing
                        }
                        onClick={() => handleUpgrade(p)}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : plan === p && status === "ACTIVE" ? (
                          "Current Plan"
                        ) : isPending && plan === p ? (
                          <>Payment Pending</>
                        ) : (
                          "Upgrade Now"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card
        id="credits-top-up"
        className="border-primary/20 bg-primary/5 scroll-mt-24"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5 text-primary" />
            Pay-as-you-go credits
          </CardTitle>
          <CardDescription>
            Buy credits with MTN or Orange Money (Fapshi). Credits are used for
            mocks, practice, and other features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <p className="text-2xl font-bold">
                {creditBalance === null ? "—" : creditBalance.toLocaleString()}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  credits
                </span>
              </p>
            </div>
            {purchaseConfig && (
              <p className="text-sm text-muted-foreground pb-1">
                Rate: {purchaseConfig.creditsPer1000Xaf} credits per 1,000 XAF ·
                min {purchaseConfig.minXafEffective.toLocaleString()} XAF · max{" "}
                {purchaseConfig.maxCreditPurchaseXaf.toLocaleString()} XAF
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Amount (XAF)</Label>
              <Input
                type="number"
                min={purchaseConfig?.minXafEffective ?? 100}
                max={purchaseConfig?.maxCreditPurchaseXaf}
                step={100}
                value={creditAmountXaf || ""}
                onChange={(e) =>
                  setCreditAmountXaf(Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated credits</Label>
              <div className="h-10 flex items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                ≈ {estimatedCredits.toLocaleString()}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleBuyCredits}
                disabled={
                  isPurchasingCredits || !purchaseConfig || estimatedCredits < 1
                }
              >
                {isPurchasingCredits ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pay with Mobile Money"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Credit cost comparison
          </CardTitle>
          <CardDescription>
            Every action costs credits. Subscribers pay less — the table below
            shows what each tier pays per action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Action</th>
                  <th className="text-right py-2 px-2 font-medium">FREE</th>
                  <th className="text-right py-2 px-2 font-medium text-blue-600">
                    STARTER{" "}
                    <span className="text-xs font-normal">(20% off)</span>
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-green-600">
                    STANDARD{" "}
                    <span className="text-xs font-normal">(40% off)</span>
                  </th>
                  <th className="text-right py-2 px-2 font-medium text-purple-600">
                    PREMIUM{" "}
                    <span className="text-xs font-normal">(60% off)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_COST_EXAMPLES.map(({ action, baseCost }) => (
                  <tr key={action} className="border-b last:border-0">
                    <td className="py-3 pr-4">{action}</td>
                    <td className="text-right py-3 px-2 font-mono">
                      {baseCost}
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-blue-600">
                      {Math.ceil(baseCost * 0.8)}
                      <span className="text-xs text-muted-foreground ml-1">
                        save {baseCost - Math.ceil(baseCost * 0.8)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-green-600">
                      {Math.ceil(baseCost * 0.6)}
                      <span className="text-xs text-muted-foreground ml-1">
                        save {baseCost - Math.ceil(baseCost * 0.6)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-2 font-mono text-purple-600">
                      {Math.ceil(baseCost * 0.4)}
                      <span className="text-xs text-muted-foreground ml-1">
                        save {baseCost - Math.ceil(baseCost * 0.4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            FREE users pay full price. Subscribers pay less AND get free credits
            each month. Example: a STANDARD subscriber saves 40% on every quiz +
            gets 1,200 free credits monthly.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Auto Payment
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Manual Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl">
                  {isPending ? "Payment Processing" : "Your Current Plan"}
                </CardTitle>
                <CardDescription>
                  {isPending
                    ? `Upgrading to ${previousPlan || plan} - please complete payment`
                    : `You are currently on the ${plan} plan`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center p-6 rounded-2xl bg-background/50 border-2 border-dashed border-primary/30">
                  <div className="text-center">
                    <Badge
                      variant="outline"
                      className={`mb-2 uppercase tracking-widest border-primary ${
                        isPending
                          ? "text-yellow-600 border-yellow-600"
                          : status === "ACTIVE"
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {isPending && previousPlan ? previousPlan : plan}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Status:{" "}
                      <span
                        className={`font-semibold uppercase ${
                          status === "ACTIVE"
                            ? "text-green-600"
                            : status === "PENDING"
                              ? "text-yellow-600"
                              : status === "FAILED"
                                ? "text-red-600"
                                : "text-muted-foreground"
                        }`}
                      >
                        {status === "NONE"
                          ? "No Subscription"
                          : status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-3">
                  {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map(
                    (feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Usage Analytics
                    </CardTitle>
                    <CardDescription>
                      Track your monthly usage limits
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Resets monthly
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      PDF Uploads
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {usage.pdfUploads} /{" "}
                      {limits.pdfUploads === -1 ? "∞" : limits.pdfUploads}
                    </div>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.pdfUploads,
                      limits.pdfUploads,
                    )}
                    className="h-2"
                  />
                  {limits.pdfUploads !== -1 &&
                    usage.pdfUploads >= limits.pdfUploads && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        You have reached your limit. Upgrade for more uploads.
                      </p>
                    )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                      Quiz Generations
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {usage.quizGenerations} /{" "}
                      {limits.quizGenerations === -1
                        ? "∞"
                        : limits.quizGenerations}
                    </div>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.quizGenerations,
                      limits.quizGenerations,
                    )}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      AI Tutor (Daily)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {usage.aiTutorMessages} /{" "}
                      {limits.aiTutorMessages === -1
                        ? "∞"
                        : limits.aiTutorMessages}
                    </div>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage.aiTutorMessages,
                      limits.aiTutorMessages,
                    )}
                    className="h-2"
                  />
                  {chatDailyUsage && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-tight">
                      <span className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        Resets at{" "}
                        {new Date(chatDailyUsage.resetsAt).toLocaleTimeString()}
                      </span>
                      <span>{chatDailyUsage.remaining} messages left</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t rounded-b-xl px-6 py-4">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Upgrade to Premium for unlimited access and priority support
                </p>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Manual Payment
              </CardTitle>
              <CardDescription>
                Pay via MTN or Orange Money manually and submit your transaction
                ID for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasPaymentNumbers ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {paymentSettings?.mtnNumber && (
                      <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-600 font-bold">
                              MTN Mobile Money
                            </span>
                          </div>
                          <p className="text-2xl font-bold">
                            {paymentSettings.mtnNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Holder: {paymentSettings.mtnHolderName || "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    {paymentSettings?.orangeNumber && (
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-orange-600 font-bold">
                              Orange Money
                            </span>
                          </div>
                          <p className="text-2xl font-bold">
                            {paymentSettings.orangeNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Holder: {paymentSettings.orangeHolderName || "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div className="grid gap-2">
                      <Label>Select Plan</Label>
                      <Select value={manualPlan} onValueChange={setManualPlan}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PLAN_PRICES).map(([key, price]) => (
                            <SelectItem key={key} value={key}>
                              {key} - {price.toLocaleString()} XAF / month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                          <SelectItem value="ORANGE">Orange Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Transaction ID</Label>
                      <Input
                        placeholder="Enter your MoMo transaction ID"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This is the transaction ID you received in your SMS
                        after sending money
                      </p>
                    </div>

                    <Button
                      onClick={handleManualSubmit}
                      disabled={isSubmittingManual}
                      className="w-full"
                    >
                      {isSubmittingManual ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit for Verification"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    Manual payment is currently not available. Please try again
                    later or use auto payment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
            <CardDescription>
              Contact our support team for any billing questions
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/contact")}
            >
              Contact Support
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Billing History</CardTitle>
            <CardDescription>
              View your past payments and receipts
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View Invoices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
