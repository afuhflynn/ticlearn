/**
 * One plan catalogue, the only place a plan price, period, label, feature or
 * limit reference is defined. The public page, the payment route, the webhook,
 * the manual route and the dashboard all read it instead of keeping their own
 * copies, so the price shown can never drift from the price charged.
 *
 * `FREE` is not a value of the `Plan` enum. It is synthesised for a user with
 * no active subscription, so the catalogue handles `"FREE"` separately from
 * the `Plan` enum values.
 */
import type { Plan } from "@/lib/generated/prisma/enums";
import { FREE_LIMITS, PAID_LIMITS } from "@/lib/plan-limits";

export interface PlanDefinition {
  key: Plan | "FREE";
  label: string;
  priceXaf: number;
  period: "forever" | "month" | "semester";
  semesterMonths?: number;
  /** Credits the plan adds to the account when it activates. */
  credits: number;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
}

export const planCatalog: Record<string, PlanDefinition> = {
  FREE: {
    key: "FREE",
    label: "Free",
    priceXaf: 0,
    period: "forever",
    credits: 200,
    features: [
      `${FREE_LIMITS.pdfUploads} notes`,
      `${FREE_LIMITS.quizGenerations} quizzes from your notes`,
      `${FREE_LIMITS.aiTutorMessages} Tip messages a day`,
      "200 starting credits, enough for 4 quizzes",
    ],
    cta: "Get Started",
    href: "/sign-up",
  },
  PRO: {
    key: "PRO",
    label: "Semester Pass",
    priceXaf: 2_500,
    period: "semester",
    semesterMonths: 5,
    credits: 12_000,
    features: [
      "Unlimited notes",
      "Unlimited quizzes from your notes",
      "Unlimited Tip messages",
      "12,000 credits included for the semester",
      "Every quiz traces back to the page it came from",
    ],
    cta: "Start Semester Pass",
    href: "/api/payment/initiate",
    popular: true,
  },
  STARTER: {
    key: "STARTER",
    label: "Starter",
    priceXaf: 3_000,
    period: "month",
    credits: 1_600,
    features: [
      `${PAID_LIMITS.STARTER.pdfUploads} notes`,
      `${PAID_LIMITS.STARTER.quizGenerations} quizzes from your notes`,
      `${PAID_LIMITS.STARTER.aiTutorMessages} Tip messages a day`,
      "1,600 credits included",
    ],
    cta: "Start Starter",
    href: "/api/payment/initiate",
  },
  STANDARD: {
    key: "STANDARD",
    label: "Standard",
    priceXaf: 5_000,
    period: "month",
    credits: 3_600,
    features: [
      `${PAID_LIMITS.STANDARD.pdfUploads} notes`,
      `${PAID_LIMITS.STANDARD.quizGenerations} quizzes from your notes`,
      "Unlimited Tip messages",
      "3,600 credits included",
    ],
    cta: "Start Standard",
    href: "/api/payment/initiate",
  },
  PREMIUM: {
    key: "PREMIUM",
    label: "Premium",
    priceXaf: 10_000,
    period: "month",
    credits: 12_000,
    features: [
      "Unlimited notes",
      "Unlimited quizzes from your notes",
      "Unlimited Tip messages",
      "12,000 credits included",
    ],
    cta: "Start Premium",
    href: "/api/payment/initiate",
  },
};

/** The two tiers the public page shows, Free and Semester Pass. */
export const publicPlans: PlanDefinition[] = [
  planCatalog.FREE,
  planCatalog.PRO,
];

/** The payable catalogue keys a student can actually buy (everything except Free). */
export const payablePlans: string[] = Object.keys(planCatalog).filter(
  (key) => key !== "FREE",
);
