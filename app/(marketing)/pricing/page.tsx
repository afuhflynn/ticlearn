"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface Subscription {
  plan: string;
  status: string;
}

const plans = [
  {
    name: "Free",
    price: "0",
    priceKey: "FREE",
    description: "Perfect for getting started",
    features: [
      "2 PDF uploads",
      "4 quiz generations",
      "A maximum of 20 quiz questions",
      "8 TiC messages/day",
      "Basic progress tracking",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Starter",
    price: "3,000",
    priceKey: "STARTER",
    description: "Great for regular students",
    features: [
      "10 PDF uploads",
      "20 quiz generations",
      "A maximum of 50 quiz questions",
      "Unlimited TiC Chats",
      "GCE Exams access",
      "Community quizzes",
      "Leaderboard access",
    ],
    cta: "Upgrade Now",
    popular: false,
  },
  {
    name: "Standard",
    price: "5,000",
    priceKey: "STANDARD",
    description: "Best for serious learners",
    features: [
      "30 PDF uploads",
      "60 quiz generations",
      "A maximum of 80 quiz questions",
      "Unlimited TiC Chats",
      "GCE Exams access",
      "Community quizzes",
      "Leaderboard access",
      "Priority support",
    ],
    cta: "Upgrade Now",
    popular: true,
  },
  {
    name: "Premium",
    price: "10,000",
    priceKey: "PREMIUM",
    description: "Ultimate learning experience",
    features: [
      "Unlimited uploads",
      "Unlimited quiz generations",
      "A maximum of 100 quiz questions",
      "Unlimited TiC Chats",
      "All features included",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Go Premium",
    popular: false,
  },
];

export default function PricingPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      if (session?.user) {
        try {
          const response = await fetch("/api/subscription");
          const data = await response.json();
          if (data.subscription) {
            setSubscription(data.subscription);
          }
        } catch (error) {
          console.error("Failed to fetch subscription:", error);
        }
      }
    }
    fetchSubscription();
  }, [session]);

  const handleSubscribe = async (planKey: string) => {
    if (!session) {
      router.push("/sign-up");
      return;
    }

    setIsSubscribing(planKey);
    try {
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await response.json();

      if (data.link) {
        window.location.href = data.link;
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch {
      toast.error("Failed to initiate payment");
    } finally {
      setIsSubscribing(null);
    }
  };

  const currentPlan = subscription?.plan || "FREE";

  if (sessionLoading || isLoadingSub) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAuthenTiCted = !!session;

  return (
    <div className="container py-12 md:py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your learning needs. All plans include a
          7-day money-back guarantee.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.priceKey;
          const isUpgrade =
            plan.priceKey === "FREE"
              ? false
              : plan.priceKey === "STARTER"
                ? ["FREE"].includes(currentPlan)
                : plan.priceKey === "STANDARD"
                  ? ["FREE", "STARTER"].includes(currentPlan)
                  : plan.priceKey === "PREMIUM"
                    ? ["FREE", "STARTER", "STANDARD"].includes(currentPlan)
                    : false;

          return (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="h-auto! flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">XFA {plan.price}</span>
                  {plan.price !== "0" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isAuthenTiCted ? (
                  isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.priceKey)}
                      disabled={isSubscribing === plan.priceKey}
                    >
                      {isSubscribing === plan.priceKey ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {isUpgrade ? plan.cta : "Subscribe"}
                        </>
                      )}
                    </Button>
                  )
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/sign-up">{plan.cta}</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground">
          Need a custom plan?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
