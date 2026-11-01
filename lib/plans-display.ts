import type { PlanDefinition } from "@/constants/plans";

/**
 * The one period line both the pricing page and the subscription page print.
 * `per 7 days` is the only weekly wording, so `per week` never appears.
 */
export function periodLabelForPlan(plan: PlanDefinition): string {
  if (plan.period === "semester") return "per semester";
  if (plan.period === "week") return "per 7 days";
  return "forever";
}

/** Secondary estimate under the semester price, derived from the catalogue. */
export function monthlyEstimateForPlan(plan: PlanDefinition): string | null {
  if (plan.period !== "semester" || !plan.semesterMonths) return null;
  const perMonth = Math.round(plan.priceXaf / plan.semesterMonths);
  return `about ${perMonth.toLocaleString()} FCFA a month (estimate), paid once`;
}
