import type { Plan } from "@/lib/generated/prisma/enums";

/** The sentinel for "no limit". Nothing else may use -1 to mean unlimited. */
export const UNLIMITED = -1;

export interface PlanLimits {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
  maxConversationMessages: number;
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
}

/**
 * `FREE` is not a value of the `Plan` enum. A user resolves to it whenever they
 * have no active subscription, so every route derives the plan the one way.
 */
export type ResolvedPlan = Plan | "FREE";

export const FREE_LIMITS: PlanLimits = {
  pdfUploads: 2,
  quizGenerations: 4,
  aiTutorMessages: 8,
  maxConversationMessages: 50,
  canAccessCommunity: false,
  canAccessLeaderboard: true,
};

export const PAID_LIMITS: Record<Plan, PlanLimits> = {
  STARTER: {
    pdfUploads: 10,
    quizGenerations: 20,
    aiTutorMessages: 50,
    maxConversationMessages: 100,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
  },
  STANDARD: {
    pdfUploads: 30,
    quizGenerations: 60,
    aiTutorMessages: UNLIMITED,
    maxConversationMessages: 200,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
  },
  PREMIUM: {
    pdfUploads: UNLIMITED,
    quizGenerations: UNLIMITED,
    aiTutorMessages: UNLIMITED,
    maxConversationMessages: 500,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
  },
  PRO: {
    pdfUploads: UNLIMITED,
    quizGenerations: UNLIMITED,
    aiTutorMessages: UNLIMITED,
    maxConversationMessages: 500,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
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
