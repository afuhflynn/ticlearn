import { PricingPlans } from "@/components/marketing/pricing-plans";
import { publicPlans } from "@/constants/plans";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "TiCLearn Pricing · Free and Semester Pass",
  description:
    "TiCLearn is free to start, and one Semester Pass at 2,500 FCFA paid over MTN Mobile Money or Orange Money unlocks unlimited notes, quizzes and Tip messages. A one time payment, no card, no auto renewal.",
  path: "/pricing",
});

/**
 * The public pricing page, from spec 0019. The heading, copy, metadata and the
 * free limits are rendered on the server, so they are in the first HTML. Only
 * the plan cards are a client island, because they own sign in state, the
 * current plan badge and the subscribe action.
 */
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mx-auto mb-10 max-w-2xl space-y-5 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Simple, honest pricing
        </h1>
        <p className="text-lg text-muted-foreground">
          Start free with 200 credits. When you are ready, one Semester Pass at
          2,500 FCFA adds 12,000 credits and removes the free limits. Paid once
          over MTN Mobile Money or Orange Money, with no card and no auto
          renewal.
        </p>
      </div>

      <PricingPlans plans={publicPlans} />

      <p className="mx-auto mt-8 max-w-lg text-center text-sm text-muted-foreground">
        A quiz uses credits from your balance, and Tip uses a small amount per
        message. Your balance is shown on your subscription page at any time.
      </p>
    </div>
  );
}
