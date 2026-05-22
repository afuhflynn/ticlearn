import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import {
  sendAdminPaymentAlert,
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
} from "@/lib/email/send";
import { CREDIT_PURCHASE_EXTERNAL_ID_PREFIX } from "@/lib/platform-settings";
import { fulfillCreditPurchaseFromFapshi } from "@/lib/credit-purchase-fulfillment";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter Plan",
  STANDARD: "Standard Plan",
  PREMIUM: "Premium Plan",
};

const PLAN_PRICES: Record<string, number> = {
  STARTER: 3000,
  STANDARD: 5000,
  PREMIUM: 10000,
};

const COMMISSION_RATE = 0.2;

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");

    if (
      !authHeader ||
      authHeader !== `Bearer ${process.env.FAPSHI_WEBHOOK_SECRET}`
    ) {
      console.error("Unauthorized webhook attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transId, status, externalId, amount } = body;

    if (!externalId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // --- Credit top-up (pay-as-you-go): externalId is prefixed ---
    if (externalId.startsWith(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX)) {
      const orderId = externalId.slice(CREDIT_PURCHASE_EXTERNAL_ID_PREFIX.length);

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

      if (!result.ok && result.reason !== "status_" + status) {
        console.error(`Credit fulfillment issue ${orderId}: ${result.reason}`);
      }

      const user = await prisma.user.findUnique({
        where: { id: order.userId },
      });
      if (user?.email && status === "SUCCESSFUL") {
        console.log(`Credit purchase webhook ${result.credited ? "credited" : "processed"} for ${user.email}`);
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // --- Subscription payment (legacy externalId = Subscription.id) ---
    const sub = await prisma.subscription.findUnique({
      where: { id: externalId },
      include: { user: true },
    });

    if (!sub) {
      console.error(`Subscription ${externalId} not found`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (status === "SUCCESSFUL") {
      const planPrice = PLAN_PRICES[sub.plan] || sub.amount;
      const commission = Math.round(planPrice * COMMISSION_RATE);

      const existingStats = await prisma.userStats.findFirst({
        where: { userId: sub.userId },
      });
      if (!existingStats) {
        const profileId = await prisma.user
          .findUnique({
            where: { id: sub.userId },
            select: { activeProfileId: true },
          })
          .then((u) => u?.activeProfileId);

        await prisma.userStats.create({
          data: {
            userId: sub.userId,
            ...(profileId ? { examProfileId: profileId } : {}),
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

      console.log(`Sending success email to ${sub.userEmail}`);
      await sendPaymentSuccessEmail({
        email: sub.userEmail,
        name: sub.userName || "Student",
        planLabel: PLAN_LABELS[sub.plan],
        amount: amount || sub.amount,
        transId: transId,
      });

      await sendAdminPaymentAlert({
        adminEmail: process.env.ADMIN_EMAIL!,
        userName: sub.userName || "User",
        userEmail: sub.userEmail,
        planLabel: PLAN_LABELS[sub.plan],
        amount: amount || sub.amount,
      });
    } else if (status === "FAILED" || status === "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "FAILED", fapshiTransId: transId },
      });

      await sendPaymentFailedEmail({
        email: sub.userEmail,
        name: sub.userName || "Student",
        planLabel: PLAN_LABELS[sub.plan],
        status: status,
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
