import type { Plan } from "@/lib/generated/prisma/enums";

/** The sentinel for "no limit". Nothing else may use -1 to mean unlimited. */
export const UNLIMITED = -1;

export interface PlanLimits {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
  maxConversationMessages: number;
}

/**
 * `FREE` is not a value of the `Plan` enum. A user resolves to it whenever they
 * have no active subscription, so every route derives the plan the one way.
 */
export type ResolvedPlan = Plan | "FREE";

export const FREE_LIMITS: PlanLimits = {
  pdfUploads: 5,
  quizGenerations: 10,
  aiTutorMessages: 15,
  maxConversationMessages: 50,
};

export const PAID_LIMITS: Record<string, PlanLimits> = {
  WEEKLY: {
    pdfUploads: 10,
    quizGenerations: 20,
    aiTutorMessages: 50,
    maxConversationMessages: 100,
  },
  STARTER: {
    pdfUploads: 10,
    quizGenerations: 20,
    aiTutorMessages: 50,
    maxConversationMessages: 100,
  },
  STANDARD: {
    pdfUploads: 30,
    quizGenerations: 60,
    aiTutorMessages: 200,
    maxConversationMessages: 200,
  },
  PREMIUM: {
    pdfUploads: 100,
    quizGenerations: 300,
    aiTutorMessages: 200,
    maxConversationMessages: 500,
  },
  PRO: {
    pdfUploads: 100,
    quizGenerations: 300,
    aiTutorMessages: 200,
    maxConversationMessages: 500,
  },
};

interface SubscriptionLike {
  plan?: Plan | string | null;
  status?: string | null;
}

export function resolvePlan(
  subscription: SubscriptionLike | null | undefined,
): ResolvedPlan {
  if (!subscription || subscription.status !== "ACTIVE") return "FREE";
  const plan = subscription.plan;
  return plan && plan in PAID_LIMITS ? (plan as Plan) : "FREE";
}

export function getPlanLimits(plan: string): PlanLimits {
  if (plan in PAID_LIMITS) return PAID_LIMITS[plan as Plan];
  return FREE_LIMITS;
}

export function isUnlimited(limit: number): boolean {
  return limit === UNLIMITED;
}

export function limitReached(limit: number, used: number): boolean {
  return !isUnlimited(limit) && used >= limit;
}

export function remainingOf(limit: number, used: number): number {
  return isUnlimited(limit) ? UNLIMITED : Math.max(0, limit - used);
}
