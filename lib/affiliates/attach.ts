import { prisma } from "@/lib/prisma";

export async function attachAffiliateReferral(params: {
  newUserId: string;
  newUserEmail: string;
  code: string | null | undefined;
}): Promise<{ attached: boolean; reason: string }> {
  const raw = params.code?.trim().toUpperCase();
  if (!raw) return { attached: false, reason: "no_code" };

  const affiliate = await prisma.affiliate
    .findUnique({
      where: { code: raw },
      select: { userId: true, userEmail: true, status: true },
    })
    .catch(() => null);
  if (!affiliate) return { attached: false, reason: "unknown_code" };
  if (affiliate.status === "REVOKED" || affiliate.status === "SUSPENDED")
    return { attached: false, reason: "revoked" };

  const email = params.newUserEmail.trim().toLowerCase();
  if (!email) return { attached: false, reason: "no_email" };
  if (affiliate.userId === params.newUserId)
    return { attached: false, reason: "self_referral" };
  if (affiliate.userEmail.trim().toLowerCase() === email)
    return { attached: false, reason: "self_referral" };

  const current = await prisma.user
    .findUnique({
      where: { id: params.newUserId },
      select: { referredBy: true },
    })
    .catch(() => null);
  if (current?.referredBy)
    return { attached: false, reason: "already_attributed" };

  await prisma.user
    .update({ where: { id: params.newUserId }, data: { referredBy: raw } })
    .catch(() => {});
  return { attached: true, reason: "attached" };
}
