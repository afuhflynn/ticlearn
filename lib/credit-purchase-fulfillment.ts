import { prisma } from "@/lib/prisma";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";

export type FulfillCreditPurchaseResult = {
  ok: boolean;
  /** Credits were applied or already existed for this order */
  credited?: boolean;
  reason?: string;
  orderId: string;
};

/**
 * Apply credit top-up when Fapshi reports success — same rules as the webhook.
 * Idempotent (safe if webhook already ran).
 */
export async function fulfillCreditPurchaseFromFapshi(params: {
  externalId: string;
  transId?: string | null;
  status: string;
}): Promise<FulfillCreditPurchaseResult> {
  const { externalId, transId, status } = params;

  if (!externalId.startsWith(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX)) {
    return { ok: false, reason: "not_a_credit_purchase", orderId: "" };
  }

  const orderId = externalId.slice(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX.length);

  if (status === "FAILED" || status === "EXPIRED") {
    await prisma.creditPurchaseOrder.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { fapshiTransId: transId ?? undefined, status: "FAILED" },
    });
    return { ok: true, credited: false, orderId };
  }

  if (status !== "SUCCESSFUL") {
    return { ok: false, reason: `status_${status}`, orderId };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.creditPurchaseOrder.findUnique({
        where: { id: orderId },
      });
      if (!fresh || fresh.status !== "PENDING") {
        return;
      }

      const dup = await tx.creditTransaction.findFirst({
        where: {
          userId: fresh.userId,
          type: "CREDIT_PURCHASE",
          referenceId: orderId,
        },
      });

      if (dup) {
        await tx.creditPurchaseOrder.update({
          where: { id: orderId },
          data: {
            status: "COMPLETED",
            fapshiTransId: transId ?? fresh.fapshiTransId,
          },
        });
        return;
      }

      await tx.user.update({
        where: { id: fresh.userId },
        data: {
          credits: { increment: fresh.creditsPromised },
          totalCreditsEarned: { increment: fresh.creditsPromised },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: fresh.userId,
          amount: fresh.creditsPromised,
          type: "CREDIT_PURCHASE",
          description: `Purchased ${fresh.creditsPromised} credits (${fresh.amountXaf} XAF)`,
          referenceId: orderId,
        },
      });

      await tx.creditPurchaseOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          fapshiTransId: transId ?? undefined,
        },
      });
    });

    const order = await prisma.creditPurchaseOrder.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    const ledger = await prisma.creditTransaction.findFirst({
      where: { referenceId: orderId, type: "CREDIT_PURCHASE" },
      select: { id: true },
    });

    if (order?.status === "COMPLETED" && ledger) {
      return { ok: true, credited: true, orderId };
    }
    if (order?.status === "COMPLETED") {
      return { ok: true, credited: false, orderId };
    }
    return { ok: false, reason: "order_still_pending", orderId };
  } catch (e) {
    console.error("fulfillCreditPurchaseFromFapshi:", e);
    return { ok: false, reason: "transaction_failed", orderId };
  }
}
