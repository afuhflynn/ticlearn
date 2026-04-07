"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for getting started",
    features: [
      "2 PDF uploads",
      "4 quiz generations",
      "8 AI tutor messages/day",
      "Basic progress tracking",
    ],
    cta: "Get Started",
    popular: false,
    planKey: "FREE",
  },
  {
    name: "Starter",
    price: "3,000",
    description: "Great for regular students",
    features: [
      "10 PDF uploads",
      "20 quiz generations",
      "Unlimited AI tutor",
      "GCE Exams access",
      "Community quizzes",
      "Leaderboard access",
    ],
    cta: "Upgrade Now",
    popular: true,
    planKey: "STARTER",
  },
  {
    name: "Standard",
    price: "5,000",
    description: "Best for serious learners",
    features: [
      "30 PDF uploads",
      "60 quiz generations",
      "Unlimited AI tutor",
      "GCE Exams access",
      "Community quizzes",
      "Leaderboard access",
      "Priority support",
    ],
    cta: "Upgrade Now",
    popular: false,
    planKey: "STANDARD",
  },
  {
    name: "Premium",
    price: "10,000",
    description: "Ultimate learning experience",
    features: [
      "Unlimited uploads",
      "Unlimited quiz generations",
      "Unlimited AI tutor",
      "All features included",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Go Premium",
    popular: false,
    planKey: "PREMIUM",
  },
];

export default function PricingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAuthenticated = !!session;

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
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular ? "border-primary shadow-lg scale-105" : ""
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
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">₣{plan.price}</span>
                {plan.price !== "0" && (
                  <span className="text-muted-foreground">FCFA</span>
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
              {isAuthenticated ? (
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={plan.name === "Free"}
                >
                  {plan.name === "Free" ? "Current Plan" : "Subscribe"}
                </Button>
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
        ))}
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
