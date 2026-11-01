import { inngest } from "@/lib/inngest/client";
import { trackEvent } from "@/lib/kpi";
import { grantCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import {
  AMBASSADOR_MAX_GRANTS_PER_USER,
  AMBASSADOR_PASS_PLAN,
  AMBASSADOR_THRESHOLD,
} from "@/lib/ambassadors/config";
import { lazyExpireReferrals } from "@/lib/ambassadors/attach";
import { planCatalog } from "@/constants/plans";

async function refreshExpiry(referredUserId: string): Promise<void> {
  await prisma.ambassadorReferral
    .updateMany({
      where: { referredUserId, status: "PENDING" },
      data: {},
    })
    .catch(() => {});
}

export async function qualifyAmbassadorReferral(params: {
  buyerId: string;
}): Promise<{ qualified: boolean; granted: boolean; reason: string }> {
  const { buyerId } = params;

  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      referredBy: true,
      ambassadorGrantBlocked: true,
    },
  });
  if (!buyer?.referredBy)
    return { qualified: false, granted: false, reason: "no_referrer" };
  if (!buyer.emailVerified)
    return { qualified: false, granted: false, reason: "email_unverified" };

  const code = buyer.referredBy.trim().toUpperCase();
  const referrer = await prisma.user.findFirst({
    where: { referralCode: code },
    select: { id: true, email: true, ambassadorGrantBlocked: true },
  });
  if (!referrer)
    return { qualified: false, granted: false, reason: "unknown_referrer" };
  if (referrer.id === buyer.id)
    return { qualified: false, granted: false, reason: "self_referral" };
  if (
    referrer.email.trim().toLowerCase() === buyer.email.trim().toLowerCase()
  ) {
    return { qualified: false, granted: false, reason: "self_referral" };
  }

  await lazyExpireReferrals(referrer.id).catch(() => {});
  await refreshExpiry(buyerId);

  const row = await prisma.ambassadorReferral.findFirst({
    where: {
      referrerId: referrer.id,
      OR: [
        { referredUserId: buyer.id },
        { invitedEmail: buyer.email.trim().toLowerCase() },
      ],
      status: { in: ["PENDING", "QUALIFIED", "REWARDED"] },
    },
  });
  if (!row) return { qualified: false, granted: false, reason: "no_row" };
  if (row.status === "FLAGGED")
    return { qualified: false, granted: false, reason: "flagged" };
  if (row.status === "REWARDED")
    return { qualified: true, granted: false, reason: "already_rewarded" };
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.ambassadorReferral
      .updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      })
      .catch(() => {});
    return { qualified: false, granted: false, reason: "expired" };
  }

  if (row.status === "PENDING") {
    await prisma.ambassadorReferral.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "QUALIFIED", qualifiedAt: new Date() },
    });
  }

  trackEvent(referrer.id, "ambassador_qualified", { code }).catch(() => {});

  // Auto grant: exactly 3 Qualified move to Rewarded in one locked transaction.
  const granted = await tryAmbassadorGrant(referrer.id);
  return { qualified: true, granted, reason: granted ? "granted" : "counted" };
}

async function tryAmbassadorGrant(referrerId: string): Promise<boolean> {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { ambassadorGrantBlocked: true, email: true, name: true },
  });
  if (!referrer || referrer.ambassadorGrantBlocked) return false;

  const existingGrants = await prisma.creditTransaction.count({
    where: {
      userId: referrerId,
      type: "BONUS",
      referenceId: `plan:ambassador:${referrerId}:1`,
    },
  });
  if (existingGrants >= AMBASSADOR_MAX_GRANTS_PER_USER) return false;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const qualified = await tx.ambassadorReferral.findMany({
        where: { referrerId, status: "QUALIFIED" },
        orderBy: { qualifiedAt: "asc" },
        take: AMBASSADOR_THRESHOLD,
        select: { id: true },
      });
      if (qualified.length < AMBASSADOR_THRESHOLD) return null;
      const ids = qualified.map((q) => q.id);
      const locked = await tx.ambassadorReferral.updateMany({
        where: { referrerId, status: "QUALIFIED", id: { in: ids } },
        data: { status: "REWARDED", rewardedAt: new Date() },
      });
      if (locked.count !== AMBASSADOR_THRESHOLD) return null;
      return ids;
    });
    if (!result) return false;
  } catch {
    return false;
  }

  // Idempotent by referenceId plan:ambassador:<userId>:1, so a webhook retry never grants twice.
  const label = planCatalog[AMBASSADOR_PASS_PLAN]?.label ?? "Semester Pass";
  await grantCredits({
    userId: referrerId,
    amount: planCatalog[AMBASSADOR_PASS_PLAN]?.credits ?? 15000,
    type: "BONUS",
    description: `Campus ambassador reward: ${label}`,
    referenceId: `plan:ambassador:${referrerId}:1`,
  }).catch(() => {});

  // Grant the pass itself through the subscription path: create an ACTIVE PRO subscription if none is active.
  try {
    const active = await prisma.subscription.findFirst({
      where: { userId: referrerId, status: "ACTIVE" },
    });
    if (!active) {
      await prisma.subscription.create({
        data: {
          userId: referrerId,
          userEmail: referrer?.email ?? "",
          userName: referrer?.name ?? "Student",
          plan: AMBASSADOR_PASS_PLAN as never,
          status: "ACTIVE",
          amount: 0,
          provider: "ambassador",
          activatedAt: new Date(),
        },
      });
    }
  } catch {
    // Credit grant is the idempotent core; a subscription race is safe to skip.
  }

  trackEvent(referrerId, "ambassador_granted", {
    plan: AMBASSADOR_PASS_PLAN,
  }).catch(() => {});
  await inngest
    .send({
      name: "email.send.lifecycle",
      data: {
        template: "ambassador-reward",
        to: referrer?.email ?? "",
        props: { firstName: referrer?.name ?? "Student", planLabel: label },
      },
    })
    .catch(() => {});

  return true;
}
