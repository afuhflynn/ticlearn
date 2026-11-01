import { planCatalog } from "@/constants/plans";
import { grantCredits } from "@/lib/credits";

/**
 * The credits a plan adds when it becomes active. A retired monthly row reads
 * as FREE elsewhere, so only the two sale tiers award credits here.
 */
export function planCredits(plan: string): number {
  switch (plan) {
    case "WEEKLY":
      return 2_500;
    case "PRO":
      return 15_000;
    default:
      return 0;
  }
}

/**
 * Grant the plan's credits once per subscription. `referenceId` makes the
 * grant idempotent, so a repeated payment callback or an admin pressing
 * activate twice cannot award the balance twice.
 */
export async function grantPlanCredits(params: {
  userId: string;
  plan: string;
  subscriptionId: string;
}): Promise<void> {
  const amount = planCredits(params.plan);
  if (amount <= 0) return;

  const label = planCatalog[params.plan]?.label ?? params.plan;

  await grantCredits({
    userId: params.userId,
    amount,
    type: "BONUS",
    description: `${label} plan credits: ${amount} cr.`,
    referenceId: `plan:${params.subscriptionId}`,
  });
}
