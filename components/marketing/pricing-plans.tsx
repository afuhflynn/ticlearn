"use client";

import { Check, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Plan } from "@/constants/plans";
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
 * The page around it is a server component, so the heading and this copy are in
 * the first HTML and only this card grid hydrates.
 */
export function PricingPlans({ plans }: { plans: Plan[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubscribe = async (planKey: string) => {
    if (!session) {
      router.push("/sign-in?callbackUrl=/pricing");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, redirectUrl: "/dashboard" }),
      });
      const data = await res.json();
      if (data.link) {
        window.location.href = data.link;
      } else {
        toast.error("Payment initiation failed. Please try again.");
      }
    } catch {
      toast.error("Failed to initiate payment");
    }
    setLoading(false);
  };

  const currentPlan = subscription?.plan || "FREE";
  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:gap-8 max-w-3xl mx-auto">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.priceKey && isActive;
        return (
          <Card
            key={plan.name}
            className={`flex flex-col ${
              plan.popular ? "border-primary shadow-lg relative" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground ms-2">
                    per{plan.period}
                  </span>
                )}
                <span className="ml-2 text-sm text-muted-foreground">FCFA</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Semester</span>
                <span className="ms-2">·</span>
                <span>{plan.period || "/month"}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isCurrentPlan ? (
                <Button className="w-full" disabled>
                  Current Plan
                </Button>
              ) : plan.priceKey === "FREE" ? (
                <Button className="w-full" variant="outline" asChild>
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.priceKey)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  {plan.cta}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
