import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { fulfillCreditPurchaseFromFapshi } from "@/lib/credit-purchase-fulfillment";
import { pollPaymentStatusUntilReady } from "@/lib/fapshi";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  transId: z.string().min(1).max(200),
  /** Query param from Fapshi redirect — unlocks DB fallback when status API is slow */
  redirectHint: z.enum(["SUCCESSFUL", "FAILED"]).optional(),
});

function normalizeGatewayStatus(status: string): string {
  const u = status.trim().toUpperCase();
  if (u === "SUCCESS" || u === "SUCCESSFUL") return "SUCCESSFUL";
  if (u === "FAILED" || u === "FAIL") return "FAILED";
  if (u === "EXPIRED") return "EXPIRED";
  return status.trim();
}

/**
 * Called when the student returns from Fapshi Mobile Money checkout.
 * Polls payment-status (gateway is often briefly stale right after redirect), then fulfills idempotently.
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "transId required" },
        { status: 400 },
      );
    }

    const transId = parsed.data.transId.trim();
    const redirectHint = parsed.data.redirectHint;

    const gatewayParsed = await pollPaymentStatusUntilReady(transId, {
      maxAttempts: 12,
    });

    let externalId = gatewayParsed?.externalId ?? "";
    let gatewayStatusRaw = gatewayParsed?.status ?? "";
    const gatewayTransId = gatewayParsed?.transId?.trim() || transId;

    /**
     * Fapshi sometimes omits fields on the first dozen polls; redirect already carries SUCCESSFUL.
     * Only use DB fallback when we own a pending order with this transId (cannot forge another user's payment).
     */
    if ((!externalId || !gatewayStatusRaw) && redirectHint === "SUCCESSFUL") {
      const pendingOrder = await prisma.creditPurchaseOrder.findFirst({
        where: {
          userId: session.user.id,
          fapshiTransId: transId,
          status: "PENDING",
        },
      });
      if (pendingOrder) {
        externalId = `${CREDIT_PURCHASE_EXTERNAL_ID_PREFIX}${pendingOrder.id}`;
        gatewayStatusRaw = "SUCCESSFUL";
      }
    }

    if (!externalId || !gatewayStatusRaw) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      });
      return NextResponse.json({
        pendingReason: "gateway_stale",
        message:
          "Payment gateway did not return details yet—your balance may update in a moment.",
        result: { ok: false, reason: "gateway_pending", orderId: "" },
        balance: user?.credits ?? 0,
      });
    }

    const gatewayStatus = normalizeGatewayStatus(gatewayStatusRaw);

    if (!externalId.startsWith(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX)) {
      return NextResponse.json(
        { error: "Not a credit purchase transaction" },
        { status: 400 },
      );
    }

    const orderId = externalId.slice(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX.length);
    const order = await prisma.creditPurchaseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await fulfillCreditPurchaseFromFapshi({
      externalId,
      transId: gatewayTransId,
      status: gatewayStatus,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    return NextResponse.json({
      result,
      balance: user?.credits ?? 0,
      softPending:
        !result.ok &&
        result.reason === "order_still_pending" &&
        gatewayStatus === "SUCCESSFUL",
    });
  } catch (error) {
    console.error("Credits reconcile POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
