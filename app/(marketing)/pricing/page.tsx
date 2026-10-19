import type { Metadata } from "next";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { plans } from "@/constants/plans";

export const metadata: Metadata = {
  title: "TiCLearn Pricing · Free and Semester Pass Plans",
  description:
    "What TiCLearn costs for a Cameroonian university student: what the free tier includes, what the semester pass adds, and how you pay over Mobile Money.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 py-12 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free. Upgrade when you&apos;re ready to take your preparation
          seriously.
        </p>
      </div>

      <PricingPlans plans={plans} />

      <div className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
        <p>
          Pay with MTN Mobile Money or Orange Money via Fapshi. All prices in
          FCFA.
        </p>
        <p className="mt-1">Cancel anytime. No long-term contracts.</p>
      </div>
    </div>
  );
}
