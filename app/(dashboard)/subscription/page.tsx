"use client";

import { useUsage, usePlan } from "@/hooks";
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Upload,
  ListTodo,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Loader2,
  Clock,
  History,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PLAN_FEATURES = {
  FREE: [
    "2 PDF Uploads",
    "4 Quiz Generations",
    "8 AI Tutor Messages / day",
    "Standard Support",
  ],
  STARTER: [
    "10 PDF Uploads",
    "20 Quiz Generations",
    "Unlimited AI Tutor Messages",
    "Community Access",
    "Leaderboard Participation",
    "GCE Exam Preparation",
  ],
  STANDARD: [
    "30 PDF Uploads",
    "60 Quiz Generations",
    "Unlimited AI Tutor Messages",
    "Everything in Starter",
    "Priority Support",
  ],
  PREMIUM: [
    "Unlimited PDF Uploads",
    "Unlimited Quiz Generations",
    "Unlimited AI Tutor Messages",
    "Everything in Standard",
    "Early Access to Features",
  ],
};

const PLAN_PRICES = {
  STARTER: 2000,
  STANDARD: 5000,
  PREMIUM: 10000,
};

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

      // Redirect to Fapshi payment page
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

  if (usageLoading) {
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Subscription & Usage
          </h1>
          <p className="text-muted-foreground">
            Manage your plan, track your usage, and upgrade for more features
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
              {Object.entries(PLAN_PRICES).map(([p, price]) => (
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      {PLAN_FEATURES[p as keyof typeof PLAN_FEATURES].map(
                        (feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ),
                      )}
                    </ul>
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
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Plan Info */}
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
                  <li key={feature} className="flex items-center gap-3 text-sm">
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

        {/* Usage Analytics */}
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
            {/* PDF Uploads */}
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
                value={getUsagePercentage(usage.pdfUploads, limits.pdfUploads)}
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

            {/* Quiz Generations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                  Quiz Generations
                </div>
                <div className="text-sm text-muted-foreground">
                  {usage.quizGenerations} /{" "}
                  {limits.quizGenerations === -1 ? "∞" : limits.quizGenerations}
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

            {/* AI Tutor Messages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  AI Tutor (Daily)
                </div>
                <div className="text-sm text-muted-foreground">
                  {usage.aiTutorMessages} /{" "}
                  {limits.aiTutorMessages === -1 ? "∞" : limits.aiTutorMessages}
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
