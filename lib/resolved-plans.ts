import { planCatalog, type PlanDefinition } from "@/constants/plans";
import { FREE_LIMITS, PAID_LIMITS, type PlanLimits } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

export interface ResolvedTier extends PlanDefinition {
  limits: PlanLimits;
  notForSale?: boolean;
}

let cache: { at: number; tiers: ResolvedTier[] } | null = null;
const CACHE_MS = 60_000;

export function clearResolvedPlansCache() {
  cache = null;
}

function isValidLimits(value: unknown): value is Partial<PlanLimits> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  for (const k of [
    "pdfUploads",
    "quizGenerations",
    "aiTutorMessages",
    "maxConversationMessages",
  ]) {
    if (k in v) {
      const n = v[k];
      if (typeof n !== "number" || n < 0 || n > 1000) return false;
    }
  }
  return true;
}

export async function getResolvedPlans(): Promise<ResolvedTier[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.tiers;

  let overrides: Array<{
    planKey: string;
    priceXaf: number | null;
    limits: unknown;
  }> = [];
  try {
    overrides = await prisma.planOverride.findMany();
  } catch {
    overrides = [];
  }
  const byKey = new Map(overrides.map((o) => [o.planKey, o]));

  const tiers: ResolvedTier[] = Object.values(planCatalog).map((def) => {
    const o = byKey.get(def.key);
    const priceXaf =
      o?.priceXaf != null && o.priceXaf >= 100 && o.priceXaf <= 20000
        ? o.priceXaf
        : def.priceXaf;
    let limits: PlanLimits;
    if (def.key === "FREE") {
      limits = { ...FREE_LIMITS };
    } else {
      limits = {
        ...((PAID_LIMITS as Record<string, PlanLimits>)[def.key] ?? {
          pdfUploads: 0,
          quizGenerations: 0,
          aiTutorMessages: 0,
          maxConversationMessages: 50,
        }),
      };
    }
    if (o?.limits && isValidLimits(o.limits)) {
      limits = { ...limits, ...(o.limits as Partial<PlanLimits>) };
    }
    return {
      ...def,
      priceXaf,
      limits,
      notForSale: def.forSale === false,
    };
  });

  cache = { at: now, tiers };
  return tiers;
}

export async function getResolvedTier(
  planKey: string,
): Promise<ResolvedTier | null> {
  const tiers = await getResolvedPlans();
  return tiers.find((t) => t.key === planKey) ?? null;
}

/** Purchase clock: 7 days for WEEKLY, 5 times 30 days for PRO from activation. */
export function planExpiryFrom(start: Date, plan: string): Date | null {
  if (plan === "WEEKLY")
    return new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  if (plan === "PRO")
    return new Date(start.getTime() + 5 * 30 * 24 * 3600 * 1000);
  return null;
}

export function isSubscriptionExpired(
  plan: string,
  activatedAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!activatedAt) return false;
  const expiry = planExpiryFrom(new Date(activatedAt), plan);
  if (!expiry) return false;
  return now >= expiry;
}
