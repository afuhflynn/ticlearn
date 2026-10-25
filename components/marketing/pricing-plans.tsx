"use client";

import { Check, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanDefinition } from "@/constants/plans";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";

interface Subscription {
  plan: string;
  status: string;
  previousPlan?: string | null;
}

/**
 * The one client island on the pricing page. It owns everything that needs
 * state: who is signed in, which plan they are on, and the subscribe button.
 * The page around it is a server component, so the heading and this copy are
 * in the first HTML and only this card grid hydrates.
 */
export function PricingPlans({ plans }: { plans: PlanDefinition[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      api.queries
        .subscription()
        .then((data) => {
          setSubscription(data.subscription ?? null);
        })
        .catch(() => {});
    }
  }, [session]);

  const currentPlan = subscription?.plan || "FREE";
  const isActive = subscription?.status === "ACTIVE";
  const isPending = subscription?.status === "PENDING";

  const handleSubscribe = async (planKey: string) => {
    if (!session) {
      router.push("/sign-in?callbackUrl=/pricing");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.link) {
        window.location.href = data.link;
      } else {
        setError(data.error || "Payment initiation failed. Please try again.");
      }
    } catch {
      setError("Failed to start payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = (plan: PlanDefinition): string => {
    if (plan.period === "semester") return "per semester";
    if (plan.period === "month") return "per month";
    return "";
  };

  const monthlyEstimate = (plan: PlanDefinition): string | null => {
    if (plan.period !== "semester" || !plan.semesterMonths) return null;
    const perMonth = Math.round(plan.priceXaf / plan.semesterMonths);
    return `about ${perMonth.toLocaleString()} FCFA a month (estimate)`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:gap-8 max-w-3xl mx-auto">
      {error && (
        <div
          className="mx-auto max-w-lg rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.key && isActive;
        const isPaid = plan.key !== "FREE";
        return (
          <Card
            key={plan.key}
            className={`flex flex-col ${
              plan.popular ? "border-primary shadow-lg relative" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  One semester
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{plan.label}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {plan.priceXaf.toLocaleString()}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">FCFA</span>
              </div>
              {periodLabel(plan) && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium">{periodLabel(plan)}</span>
                </div>
              )}
              {monthlyEstimate(plan) && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {monthlyEstimate(plan)}
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-chart-1" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {!isPaid ? (
                <Button className="w-full" variant="outline" asChild>
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              ) : isCurrentPlan ? (
                <>
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    Buying the Semester Pass replaces your current plan.
                  </p>
                </>
              ) : isPending ? (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.key)}
                  >
                    {plan.cta}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    Finish on your phone: complete the payment and come back.
                  </p>
                </>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Smartphone className="mr-2 h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      {plan.cta}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
