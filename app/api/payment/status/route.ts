import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fulfillCreditPurchaseFromFapshi } from "@/lib/credit-purchase-fulfillment";
import {
  getPaymentStatus,
  parseFapshiPaymentStatusPayload,
} from "@/lib/fapshi";
import { inngest } from "@/lib/inngest/client";
import { planCatalog } from "@/constants/plans";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";
import { fulfillSubscriptionFromFapshi } from "@/lib/subscription-fulfillment";

function doualaDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      timeZone: "Africa/Douala",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

export async function GET(request: Request) {
  try {
    const limited = await limit("payment-status", request).catch(() => null);
    if (limited) return limited;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const transId = searchParams.get("transId")?.trim();
    if (!transId) {
      return NextResponse.json({ error: "Missing transId" }, { status: 400 });
    }

    const [sub, order] = await Promise.all([
      prisma.subscription.findFirst({ where: { fapshiTransId: transId } }),
      prisma.creditPurchaseOrder.findFirst({
        where: { fapshiTransId: transId },
      }),
    ]);

    const row = sub ?? order;
    if (!row) {
      return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    }
    if (row.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sub) {
      if (sub.status === "ACTIVE") {
        return NextResponse.json({
          kind: "pass",
          status: "ACTIVE",
          plan: sub.plan,
          transId,
          paidAt: sub.activatedAt?.toISOString() ?? null,
          paidAtLabel: sub.activatedAt
            ? doualaDate(sub.activatedAt.toISOString())
            : null,
          next: "Receipt is on the subscription page with the transaction id.",
        });
      }
      if (sub.status === "FAILED") {
        return NextResponse.json({
          kind: "pass",
          status: "FAILED",
          plan: sub.plan,
          transId,
          next: "That attempt did not go through. Start again and a new PIN prompt is sent.",
        });
      }

      const raw = await getPaymentStatus(transId);
      const parsed = raw ? parseFapshiPaymentStatusPayload(raw) : null;
      const providerStatus = parsed?.status?.toUpperCase() ?? null;

      // Poll bridge: webhook stays the primary truth, but a missed
      // webhook heals here once Fapshi confirms SUCCESSFUL.
      if (providerStatus === "SUCCESSFUL" || providerStatus === "SUCCESS") {
        const externalId = parsed?.externalId || sub.id;
        if (externalId === sub.id) {
          const healed = await fulfillSubscriptionFromFapshi({
            externalId: sub.id,
            transId: parsed?.transId || transId,
            status: "SUCCESSFUL",
          });
          if (healed.ok && healed.transitioned) {
            const fresh = await prisma.subscription.findUnique({
              where: { id: sub.id },
            });
            await inngest
              .send({
                name: "email.send.payment",
                data: {
                  template: "payment-received",
                  to: sub.userEmail,
                  props: {
                    firstName: sub.userName || "Student",
                    planLabel: planCatalog[sub.plan]?.label ?? sub.plan,
                    amountFcfa: sub.amount,
                    reference: transId,
                    paidAt: new Date().toISOString(),
                    practiceUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/quizzes`,
                  },
                },
              })
              .catch(() => {});
            return NextResponse.json({
              kind: "pass",
              status: "ACTIVE",
              plan: sub.plan,
              transId,
              paidAt: fresh?.activatedAt?.toISOString() ?? null,
              next: "Receipt is on the subscription page with the transaction id.",
            });
          }
          if (healed.ok) {
            const fresh = await prisma.subscription.findUnique({
              where: { id: sub.id },
            });
            if (fresh?.status === "ACTIVE") {
              return NextResponse.json({
                kind: "pass",
                status: "ACTIVE",
                plan: sub.plan,
                transId,
                next: "Receipt is on the subscription page with the transaction id.",
              });
            }
          }
        }
      }

      return NextResponse.json({
        kind: "pass",
        status: "PENDING",
        plan: sub.plan,
        transId,
        providerStatus,
        next: "Still waiting on the phone prompt. Finish the PIN on your phone, then press Recheck.",
        pollHint:
          "Recheck every 5 seconds up to 5 minutes, then contact support with the transaction id.",
      });
    }

    // Credit order thread.
    if (!order) {
      return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    }
    if (order.status === "COMPLETED") {
      return NextResponse.json({
        kind: "credits",
        status: "ACTIVE",
        transId,
        credits: order.creditsPromised,
        amount: order.amountXaf,
        next: "Credits are on your account.",
      });
    }
    if (order.status === "FAILED") {
      return NextResponse.json({
        kind: "credits",
        status: "FAILED",
        transId,
        next: "That attempt did not go through. Start again and a new PIN prompt is sent.",
      });
    }

    const raw = await getPaymentStatus(transId);
    const parsed = raw ? parseFapshiPaymentStatusPayload(raw) : null;
    const providerStatus = parsed?.status?.toUpperCase() ?? null;

    if (providerStatus === "SUCCESSFUL" || providerStatus === "SUCCESS") {
      const externalId =
        parsed?.externalId ||
        `${CREDIT_PURCHASE_EXTERNAL_ID_PREFIX}${order.id}`;
      if (externalId === `${CREDIT_PURCHASE_EXTERNAL_ID_PREFIX}${order.id}`) {
        const healed = await fulfillCreditPurchaseFromFapshi({
          externalId,
          transId: parsed?.transId || transId,
          status: "SUCCESSFUL",
        });
        if (healed.ok) {
          return NextResponse.json({
            kind: "credits",
            status: "ACTIVE",
            transId,
            credits: order.creditsPromised,
            amount: order.amountXaf,
            next: "Credits are on your account.",
          });
        }
      }
    }

    return NextResponse.json({
      kind: "credits",
      status: "PENDING",
      transId,
      credits: order.creditsPromised,
      amount: order.amountXaf,
      providerStatus,
      next: "Still waiting on the phone prompt. Finish the PIN on your phone, then press Recheck.",
      pollHint:
        "Recheck every 5 seconds up to 5 minutes, then contact support with the transaction id.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not check the payment" },
      { status: 500 },
    );
  }
}
