"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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
  const hasPaidPlan = isActive && currentPlan !== "FREE";

  const handleSubscribe = async (planKey: string) => {
    if (!session) {
      router.push("/sign-in?callbackUrl=/pricing");
      return;
    }

    setLoadingPlan(planKey);
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
      setLoadingPlan(null);
    }
  };

  const periodLabel = (plan: PlanDefinition): string => {
    if (plan.period === "semester") return "per semester";
    if (plan.period === "week") return "per 7 days";
    if (plan.period === "month") return "per month";
    return "forever";
  };

  const monthlyEstimate = (plan: PlanDefinition): string | null => {
    if (plan.period !== "semester" || !plan.semesterMonths) return null;
    const perMonth = Math.round(plan.priceXaf / plan.semesterMonths);
    return `about ${perMonth.toLocaleString()} FCFA a month (estimate), paid once`;
  };

  return (
    <div className="space-y-6">
      {error ? (
        <Alert
          className="border-destructive/50 bg-destructive/10 text-destructive"
          variant="destructive"
        >
          {error}
        </Alert>
      ) : null}

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 lg:gap-8">
        {plans.map((plan) => {
          const isFree = plan.key === "FREE";
          const isCurrentPlan = currentPlan === plan.key && isActive;
          return (
            <Card
              key={plan.key}
              className={
                plan.popular
                  ? "flex flex-col border-primary ring-1 ring-primary"
                  : "flex flex-col"
              }
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-2xl font-bold">
                    {plan.label}
                  </CardTitle>
                  {plan.popular ? (
                    <Badge className="gap-1">
                      <Sparkles className="size-3" />
                      One semester
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums">
                    {plan.priceXaf.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">FCFA</span>
                  <span className="text-sm text-muted-foreground">
                    {periodLabel(plan)}
                  </span>
                </div>

                {monthlyEstimate(plan) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {monthlyEstimate(plan)}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-2">
                {isFree ? (
                  isCurrentPlan || (session && currentPlan === "FREE") ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current plan
                    </Button>
                  ) : session ? (
                    <Button className="w-full" variant="outline" disabled>
                      Included in every account
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href={plan.href}>{plan.cta}</Link>
                    </Button>
                  )
                ) : isCurrentPlan ? (
                  <Button className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === plan.key
                        ? "Starting payment…"
                        : plan.cta}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      {isPending
                        ? "Finish on your phone, then come back here."
                        : hasPaidPlan
                          ? "Buying a new pass replaces your current plan at its end date."
                          : "Paid once over MTN Mobile Money or Orange Money."}
                    </p>
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
