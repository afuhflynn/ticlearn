/**
 * One plan list, read by the server page and by the client island that owns the
 * subscribe handler. It lives here rather than inline in the page so the two
 * halves cannot drift apart.
 */
export interface Plan {
  name: string;
  price: string;
  period?: string;
  priceKey: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  href: string;
}

export const plans: Plan[] = [
  {
    name: "Free",
    price: "0",
    priceKey: "FREE",
    description: "Perfect for getting started",
    features: [
      "2 notes",
      "4 quizzes from your notes",
      "8 Tip messages a day",
      "Basic readiness score",
      "Leaderboard",
    ],
    cta: "Get Started",
    popular: false,
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: "3,500",
    period: "/month",
    priceKey: "PRO",
    description: "For serious study",
    features: [
      "Unlimited notes",
      "Unlimited quizzes from your notes",
      "Unlimited Tip messages",
      "Advanced readiness analytics & trends",
      "Community and leaderboards",
    ],
    cta: "Start Free Trial",
    popular: true,
    href: "/api/payment/initiate",
  },
];
