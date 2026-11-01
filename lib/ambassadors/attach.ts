import { AMBASSADOR_EXPIRY_DAYS } from "@/lib/ambassadors/config";
import { findReferrerByCode } from "@/lib/ambassadors/code";
import { prisma } from "@/lib/prisma";

function expiryFrom(date: Date): Date {
  return new Date(
    date.getTime() + AMBASSADOR_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function attachAmbassadorReferral(params: {
  newUserId: string;
  newUserEmail: string;
  code: string | null | undefined;
}): Promise<{ attached: boolean; reason: string; referrerId?: string }> {
  const raw = params.code?.trim().toUpperCase();
  if (!raw) return { attached: false, reason: "no_code" };

  const referrer = await findReferrerByCode(raw);
  if (!referrer) return { attached: false, reason: "unknown_code" };

  const email = params.newUserEmail.trim().toLowerCase();
  if (!email) return { attached: false, reason: "no_email" };

  // Self referral never qualifies: same user, same email, or same verified phone is checked at qualify time.
  // The userId check is the cheap fail closed here.
  if (referrer.id === params.newUserId) {
    return { attached: false, reason: "self_referral" };
  }
  const referrerEmail = referrer.email.trim().toLowerCase();
  if (referrerEmail === email) {
    return { attached: false, reason: "self_referral" };
  }

  // First touch wins: one lowercased email maps to at most one referrer while not Flagged.
  const existing = await prisma.ambassadorReferral.findFirst({
    where: { invitedEmail: email, status: { not: "FLAGGED" } },
    select: { id: true, referrerId: true },
  });
  if (existing) {
    // Bind the user row for audit but keep the original referrer.
    await prisma.user
      .update({
        where: { id: params.newUserId },
        data: { referredBy: raw },
      })
      .catch(() => {});
    return {
      attached: false,
      reason: "already_attributed",
      referrerId: existing.referrerId,
    };
  }

  const now = new Date();
  try {
    await prisma.ambassadorReferral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: params.newUserId,
        invitedEmail: email,
        codeUsed: raw,
        status: "PENDING",
        expiresAt: expiryFrom(now),
      },
    });
  } catch {
    return { attached: false, reason: "race_lost" };
  }

  await prisma.user
    .update({
      where: { id: params.newUserId },
      data: { referredBy: raw },
    })
    .catch(() => {});

  return { attached: true, reason: "attached", referrerId: referrer.id };
}

export async function lazyExpireReferrals(referrerId?: string): Promise<void> {
  const now = new Date();
  await prisma.ambassadorReferral
    .updateMany({
      where: {
        ...(referrerId ? { referrerId } : {}),
        status: "PENDING",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    })
    .catch(() => {});
}
