import {
  affiliateCommissionRate,
  commissionForAmount,
} from "@/lib/affiliates/config";
import { prisma } from "@/lib/prisma";

export async function recordAffiliateEarning(params: {
  buyerId: string;
  amountXaf: number;
  plan: string;
  orderReference: string;
  fapshiTransId?: string | null;
}): Promise<{ created: boolean; reason: string }> {
  const { buyerId, amountXaf, plan, orderReference, fapshiTransId } = params;
  if (!orderReference) return { created: false, reason: "no_order_reference" };

  const existing = await prisma.affiliateEarning
    .findUnique({ where: { orderReference }, select: { id: true } })
    .catch(() => null);
  if (existing) return { created: false, reason: "duplicate_order" };

  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, email: true, emailVerified: true, referredBy: true },
  });
  if (!buyer?.referredBy) return { created: false, reason: "no_referrer" };
  if (buyer.emailVerified !== true)
    return { created: false, reason: "email_unverified" };

  const code = buyer.referredBy.trim().toUpperCase();
  const affiliate = await prisma.affiliate
    .findUnique({
      where: { code },
      select: { code: true, userId: true, userEmail: true, status: true },
    })
    .catch(() => null);
  if (!affiliate || affiliate.status !== "ACTIVE")
    return { created: false, reason: "not_active_partner" };

  const buyerEmail = buyer.email.trim().toLowerCase();
  if (affiliate.userId === buyerId)
    return { created: false, reason: "self_referral" };
  if (affiliate.userEmail.trim().toLowerCase() === buyerEmail)
    return { created: false, reason: "self_referral" };

  const rate = affiliateCommissionRate();
  const commission = commissionForAmount(amountXaf, rate);
  if (commission <= 0) return { created: false, reason: "zero_commission" };

  try {
    await prisma.affiliateEarning.create({
      data: {
        affiliateCode: affiliate.code,
        affiliateEmail: affiliate.userEmail,
        referredUserId: buyerId,
        referredUserEmail: buyer.email,
        plan: String(plan),
        amount: Math.floor(amountXaf),
        commission,
        commissionRate: rate,
        status: "PENDING",
        orderReference,
        fapshiTransId: fapshiTransId ?? undefined,
      },
    });
  } catch {
    return { created: false, reason: "race_lost" };
  }

  await prisma.affiliate
    .update({
      where: { code: affiliate.code },
      data: {
        pendingEarnings: { increment: commission },
        totalEarnings: { increment: commission },
        totalConversions: { increment: 1 },
      },
    })
    .catch(() => {});

  return { created: true, reason: "created" };
}
