import { grantPlanCredits } from "@/lib/plan-credits";
import { prisma } from "@/lib/prisma";

export type FulfillSubscriptionResult = {
  ok: boolean;
  /** True only when this call moved PENDING to ACTIVE. Drives receipt email. */
  transitioned?: boolean;
  reason?: string;
  subscriptionId: string;
};

function normalizeGatewayStatus(status: string): string {
  const u = status.trim().toUpperCase();
  if (u === "SUCCESS" || u === "SUCCESSFUL") return "SUCCESSFUL";
  if (u === "FAIL" || u === "FAILED") return "FAILED";
  if (u === "EXPIRED") return "EXPIRED";
  return u;
}

/**
 * Shared pass fulfill path for the webhook and the status poll bridge.
 * One writer at a time by row: the PENDING to ACTIVE move is a single
 * conditional update, so a webhook plus poll pair grants once.
 * Only SUCCESSFUL heals. Anything else leaves the row PENDING.
 */
export async function fulfillSubscriptionFromFapshi(params: {
  externalId: string;
  transId?: string | null;
  status: string;
}): Promise<FulfillSubscriptionResult> {
  const { externalId, transId } = params;
  const status = normalizeGatewayStatus(params.status);

  if (status === "FAILED" || status === "EXPIRED") {
    await prisma.subscription.updateMany({
      where: { id: externalId, status: "PENDING" },
      data: { fapshiTransId: transId ?? undefined, status: "FAILED" },
    });
    return { ok: true, transitioned: false, subscriptionId: externalId };
  }

  if (status !== "SUCCESSFUL") {
    return {
      ok: false,
      reason: `status_${status}`,
      subscriptionId: externalId,
    };
  }

  const sub = await prisma.subscription.findUnique({
    where: { id: externalId },
  });
  if (!sub) {
    return { ok: false, reason: "not_found", subscriptionId: externalId };
  }
  if (sub.status === "ACTIVE") {
    return { ok: true, transitioned: false, subscriptionId: externalId };
  }
  if (sub.status !== "PENDING") {
    return { ok: false, reason: "not_pending", subscriptionId: externalId };
  }
  // A late callback for an older attempt must not stomp the current one.
  if (sub.fapshiTransId && transId && sub.fapshiTransId !== transId) {
    return { ok: false, reason: "stale_transId", subscriptionId: externalId };
  }

  const moved = await prisma.subscription.updateMany({
    where: { id: externalId, status: "PENDING" },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
      fapshiTransId: transId ?? sub.fapshiTransId,
    },
  });
  if (moved.count === 0) {
    return { ok: true, transitioned: false, subscriptionId: externalId };
  }

  const stats = await prisma.userStats.findFirst({
    where: { userId: sub.userId },
  });
  if (!stats) {
    await prisma.userStats.create({ data: { userId: sub.userId } });
  }

  // Idempotent by referenceId plan:<subscriptionId>, so a double
  // delivery grants the plan credits once.
  await grantPlanCredits({
    userId: sub.userId,
    plan: sub.plan,
    subscriptionId: sub.id,
  }).catch((error) => console.error("grantPlanCredits failed:", error));

  // Ambassador qualify runs on the same settled signal, idempotent by row state.
  const { qualifyAmbassadorReferral } = await import(
    "@/lib/ambassadors/qualify"
  );
  await qualifyAmbassadorReferral({ buyerId: sub.userId }).catch((error) =>
    console.error("ambassador qualify failed:", error),
  );

  return { ok: true, transitioned: true, subscriptionId: externalId };
}
