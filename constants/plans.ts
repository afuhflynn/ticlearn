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
  period: "forever" | "week" | "month" | "semester";
  semesterMonths?: number;
  periodDays?: number;
  /** Credits the plan adds to the account when it activates. */
  credits: number;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
  forSale?: boolean;
}

export const planCatalog: Record<string, PlanDefinition> = {
  FREE: {
    key: "FREE",
    label: "Free",
    priceXaf: 0,
    period: "forever",
    credits: 200,
    forSale: true,
    features: [
      `${FREE_LIMITS.pdfUploads} notes`,
      `${FREE_LIMITS.quizGenerations} quizzes from your notes`,
      `${FREE_LIMITS.aiTutorMessages} Tip messages a day`,
      "200 starting credits, enough for 4 quizzes",
    ],
    cta: "Get Started",
    href: "/sign-up",
  },
  WEEKLY: {
    key: "WEEKLY" as Plan,
    label: "Weekly Pass",
    priceXaf: 500,
    period: "week",
    periodDays: 7,
    credits: 2500,
    forSale: true,
    features: [
      "10 notes",
      "20 quizzes from your notes",
      "50 Tip messages a day",
      "2,500 credits included for the week",
    ],
    cta: "Start Weekly Pass",
    href: "/api/payment/initiate",
  },
  PRO: {
    key: "PRO",
    label: "Semester Pass",
    priceXaf: 3000,
    period: "semester",
    semesterMonths: 5,
    credits: 15000,
    forSale: true,
    features: [
      "100 notes",
      "300 quizzes from your notes",
      "200 Tip messages a day",
      "15,000 credits included for the semester",
      "Every quiz traces back to the page it came from",
    ],
    cta: "Start Semester Pass",
    href: "/api/payment/initiate",
    popular: true,
  },
  STARTER: {
    key: "STARTER",
    label: "Starter",
    priceXaf: 3000,
    period: "month",
    credits: 1600,
    forSale: false,
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
    priceXaf: 5000,
    period: "month",
    credits: 3600,
    forSale: false,
    features: [
      `${PAID_LIMITS.STANDARD.pdfUploads} notes`,
      `${PAID_LIMITS.STANDARD.quizGenerations} quizzes from your notes`,
      `${PAID_LIMITS.STANDARD.aiTutorMessages} Tip messages a day`,
      "3,600 credits included",
    ],
    cta: "Start Standard",
    href: "/api/payment/initiate",
  },
  PREMIUM: {
    key: "PREMIUM",
    label: "Premium",
    priceXaf: 10000,
    period: "month",
    credits: 12000,
    forSale: false,
    features: [
      `${PAID_LIMITS.PREMIUM.pdfUploads} notes`,
      `${PAID_LIMITS.PREMIUM.quizGenerations} quizzes from your notes`,
      `${PAID_LIMITS.PREMIUM.aiTutorMessages} Tip messages a day`,
      "12,000 credits included",
    ],
    cta: "Start Premium",
    href: "/api/payment/initiate",
  },
};

/** The tiers the public page shows, Free plus Weekly plus Semester. */
export const publicPlans: PlanDefinition[] = [
  planCatalog.FREE,
  planCatalog.WEEKLY,
  planCatalog.PRO,
];

/** The payable catalogue keys a student can actually buy. */
export const payablePlans: string[] = ["WEEKLY", "PRO"];

/** Monthly keys stay valid for old active subs but are not for sale. */
export const legacyPlans: string[] = ["STARTER", "STANDARD", "PREMIUM"];
