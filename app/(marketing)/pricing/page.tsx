import type { Metadata } from "next";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { publicPlans } from "@/constants/plans";

export const metadata: Metadata = {
  title: "TiCLearn Pricing · Free and Semester Pass",
  description:
    "TiCLearn is free to start, and one Semester Pass at 2,500 FCFA paid over MTN Mobile Money or Orange Money unlocks unlimited notes, quizzes and Tip messages. A one time payment, no card, no auto renewal.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "TiCLearn Pricing · Free and Semester Pass",
    description:
      "Free to start, 2,500 FCFA Semester Pass over MTN Mobile Money or Orange Money. One time payment, no card, no auto renewal.",
    url: "https://ticlearn.ticsummit.org/pricing",
    type: "website",
    locale: "en_CM",
    siteName: "TiCLearn",
  },
  twitter: {
    title: "TiCLearn Pricing · Free and Semester Pass",
    description:
      "Free to start, 2,500 FCFA Semester Pass over MTN Mobile Money or Orange Money. One time payment, no card, no auto renewal.",
    card: "summary_large_image",
  },
};

/**
 * The public pricing page, from spec 0019. The heading, copy, metadata and the
 * free limits are rendered on the server, so they are in the first HTML. Only
 * the plan cards are a client island, because they own sign in state, the
 * current plan badge and the subscribe action.
 */
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-12 px-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Simple, honest pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start free. When you are ready, one Semester Pass at 2,500 FCFA paid
          over MTN Mobile Money or Orange Money unlocks unlimited notes, quizzes
          and Tip messages. One time payment, no card, no auto renewal.
        </p>
      </div>

      <PricingPlans plans={publicPlans} />

      <div className="text-center text-sm text-muted-foreground max-w-lg mx-auto space-y-2">
        <p>
          Pay with MTN Mobile Money or Orange Money via Fapshi. This is a one
          time payment for the semester: no auto renewal, no card and no hidden
          charge.
        </p>
      </div>
    </div>
  );
}
