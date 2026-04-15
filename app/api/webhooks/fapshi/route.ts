import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import {
  sendAdminPaymentAlert,
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
} from "@/lib/email/send";

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
    // 1. Security Check
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
    const {
      transId,
      status,
      externalId,
      amount,
      dateConfirmed,
      financialTransId,
    } = body;

    if (!externalId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 2. Find Subscription
    const sub = await prisma.subscription.findUnique({
      where: { id: externalId },
      include: { user: true },
    });

    if (!sub) {
      console.error(`Subscription ${externalId} not found`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 3. Handle SUCCESSFUL Status
    if (status === "SUCCESSFUL") {
      const planPrice = PLAN_PRICES[sub.plan] || sub.amount;
      const commission = Math.round(planPrice * COMMISSION_RATE);

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            activatedAt: new Date(),
            fapshiTransId: transId,
          },
        }),
        prisma.userStats.upsert({
          where: { userId: sub.userId },
          update: {},
          create: { userId: sub.userId },
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

      const planLabel = PLAN_LABELS[sub.plan] || sub.plan;

      // --- EMAIL TO USER ---
      console.log(`Sending success email to ${sub.userEmail}`);
      await sendPaymentSuccessEmail({
        email: sub.userEmail,
        name: sub.userName || "Student",
        planLabel: PLAN_LABELS[sub.plan],
        amount: amount || sub.amount,
        transId: transId,
      });

      // --- EMAIL TO ADMIN ---
      await sendAdminPaymentAlert({
        adminEmail: process.env.ADMIN_EMAIL!,
        userName: sub.userName || "User",
        userEmail: sub.userEmail,
        planLabel: PLAN_LABELS[sub.plan],
        amount: amount || sub.amount,
      });
    }
    // 4. Handle FAILURE / EXPIRED
    else if (status === "FAILED" || status === "EXPIRED") {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "FAILED", fapshiTransId: transId },
      });

      // --- EMAIL TO USER (FAILURE) ---
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
