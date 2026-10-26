import { planCatalog } from "@/constants/plans";
import { grantCredits } from "@/lib/credits";

/**
 * The credits a plan adds when it becomes active. The amounts are sized so a
 * student can use the plan's own quiz allowance: 4 free quizzes take the 200
 * signup credits, and every paid plan carries enough for its included quota.
 */
export function planCredits(plan: string): number {
  switch (plan) {
    case "STARTER":
      return 1_600;
    case "STANDARD":
      return 3_600;
    case "PREMIUM":
      return 12_000;
    case "PRO":
      return 12_000;
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
