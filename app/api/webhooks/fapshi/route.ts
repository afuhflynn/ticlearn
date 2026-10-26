import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { planCatalog } from "@/constants/plans";
import { fulfillCreditPurchaseFromFapshi } from "@/lib/credit-purchase-fulfillment";
import { webhookSecret } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";
import { EVENTS, trackEvent } from "@/lib/kpi";
import { grantPlanCredits } from "@/lib/plan-credits";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const COMMISSION_RATE = 0.2;

function planLabel(plan: string): string {
  return planCatalog[plan]?.label || plan;
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function logSecurityEvent(event: string, data: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");

    const secret = webhookSecret;
    if (!secret) {
      logSecurityEvent("webhook_rejected", {
        route: "/api/webhooks/fapshi",
        reason: "webhook_secret_unset",
      });
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 },
      );
    }

    const expectedAuth = `Bearer ${secret}`;
    if (!authHeader || !constantTimeCompare(authHeader, expectedAuth)) {
      logSecurityEvent("webhook_rejected", {
        route: "/api/webhooks/fapshi",
        reason: "invalid_secret",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transId, status, externalId } = body;

    if (!externalId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const existingSubscription = await prisma.subscription.findFirst({
      where: { fapshiTransId: transId },
    });

    const existingCreditOrder = await prisma.creditPurchaseOrder.findFirst({
      where: { fapshiTransId: transId },
    });

    const existingAffiliateEarning = await prisma.affiliateEarning.findFirst({
      where: { fapshiTransId: transId },
    });

    const isReplay =
      existingSubscription || existingCreditOrder || existingAffiliateEarning;

    if (isReplay) {
      if (
        existingSubscription?.status === "ACTIVE" &&
        status === "SUCCESSFUL"
      ) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      if (
        existingSubscription?.status === "FAILED" &&
        status === "SUCCESSFUL"
      ) {
        // Allow FAILED then SUCCESSFUL sequence
      } else {
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    if (externalId.startsWith(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX)) {
      const orderId = externalId.slice(
        CREDIT_PURCHASE_EXTERNAL_ID_PREFIX.length,
      );

      const order = await prisma.creditPurchaseOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        console.error(`Credit purchase order ${orderId} not found`);
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const result = await fulfillCreditPurchaseFromFapshi({
        externalId,
        transId,
        status,
      });

      if (!result.ok && result.reason !== `status_${status}`) {
        console.error(`Credit fulfillment issue ${orderId}: ${result.reason}`);
      }

      const user = await prisma.user.findUnique({
        where: { id: order.userId },
      });
      if (user?.email && status === "SUCCESSFUL") {
        console.log(
          `Credit purchase webhook ${result.credited ? "credited" : "processed"} for ${user.email}`,
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: externalId },
      include: { user: true },
    });

    if (!sub) {
      console.error(`Subscription ${externalId} not found`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // A late callback for an older attempt must not stomp the current one: if
    // the incoming transId differs from the stored fapshiTransId, it is a
    // stale event and is ignored.
    if (sub.fapshiTransId && sub.fapshiTransId !== transId) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (status === "SUCCESSFUL") {
      // Use the stored amount, not the body amount, so an in flight payment is
      // receipted at what the student actually paid even if the catalogue
      // changes later.
      const planPrice = sub.amount;
      const commission = Math.round(planPrice * COMMISSION_RATE);

      const existingStats = await prisma.userStats.findFirst({
        where: { userId: sub.userId },
      });
      if (!existingStats) {
        await prisma.userStats.create({
          data: {
            userId: sub.userId,
          },
        });
      }

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            activatedAt: new Date(),
            fapshiTransId: transId,
          },
        }),
      ]);

      trackEvent(sub.userId, EVENTS.SUBSCRIPTION_ACTIVATED, {
        plan: sub.plan,
        amount: planPrice,
      }).catch(() => {});

      // Award plan-based credits once when a subscription activates, so a
      // paid plan comes with its credits included and no separate purchase.
      await grantPlanCredits({
        userId: sub.userId,
        plan: sub.plan,
        subscriptionId: sub.id,
      }).catch(console.error);

      if (sub.user.referredBy) {
        const affiliate = await prisma.affiliate.findUnique({
          where: { code: sub.user.referredBy },
        });

        if (affiliate && affiliate.status === "ACTIVE") {
          await prisma.affiliateEarning.create({
            data: {
              affiliateCode: affiliate.code,
              affiliateEmail: affiliate.userEmail,
              referredUserId: sub.userId,
              referredUserEmail: sub.userEmail,
              plan: sub.plan,
              amount: planPrice,
              commission: commission,
              status: "PENDING",
              fapshiTransId: transId,
            },
          });

          await prisma.affiliate.update({
            where: { id: affiliate.id },
            data: {
              pendingEarnings: { increment: commission },
              totalEarnings: { increment: commission },
            },
          });

          console.log(
            `Created affiliate earning: ${commission} XFA for ${affiliate.code}`,
          );
        }
      }

      console.log(`Enqueueing payment emails for ${sub.userEmail}`);
      await inngest.send({
        name: "email.send.payment",
        data: {
          template: "payment-received",
          to: sub.userEmail,
          props: {
            firstName: sub.userName || "Student",
            planLabel: planLabel(sub.plan),
            amountFcfa: sub.amount,
            reference: transId,
            paidAt: new Date().toISOString(),
            practiceUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/quizzes`,
          },
        },
      });

      await inngest.send({
        name: "email.send.payment",
        data: {
          template: "admin-payment-alert",
          to: process.env.ADMIN_EMAIL!,
          props: {
            userName: sub.userName || "User",
            userEmail: sub.userEmail,
            planLabel: planLabel(sub.plan),
            amountFcfa: sub.amount,
            reference: transId,
          },
        },
      });
    } else if (status === "FAILED" || status === "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "FAILED", fapshiTransId: transId },
      });

      await inngest.send({
        name: "email.send.payment",
        data: {
          template: "payment-failed",
          to: sub.userEmail,
          props: {
            firstName: sub.userName || "Student",
            planLabel: planLabel(sub.plan),
            subscriptionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/subscription`,
          },
        },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Fapshi webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
