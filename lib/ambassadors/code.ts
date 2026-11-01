import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6);
    try {
      const updated = await prisma.user.update({
        where: { id: userId, referralCode: null as never },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch {
      // Unique collision, retry with a fresh code.
    }
    const reread = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (reread?.referralCode) return reread.referralCode;
  }

  const fallback = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (!fallback?.referralCode) {
    throw new Error("Could not mint a referral code");
  }
  return fallback.referralCode;
}

export async function findReferrerByCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  return prisma.user.findFirst({
    where: { referralCode: clean },
    select: { id: true, email: true, referralCode: true },
  });
}
