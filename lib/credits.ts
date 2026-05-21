import type { CreditType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export class InsufficientCreditsError extends Error {
  readonly required: number;
  readonly balance: number;

  constructor(required: number, balance: number) {
    super(`Insufficient credits. Need ${required}, have ${balance}.`);
    this.name = "InsufficientCreditsError";
    this.required = required;
    this.balance = balance;
  }
}

export async function getUserCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits ?? 0;
}

export async function spendCredits(params: {
  userId: string;
  amount: number;
  type: CreditType;
  description?: string;
  referenceId?: string;
}): Promise<{ balance: number }> {
  const { userId, amount, type, description, referenceId } = params;

  if (amount <= 0) {
    const balance = await getUserCreditBalance(userId);
    return { balance };
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits < amount) {
      throw new InsufficientCreditsError(amount, user.credits);
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type,
        description,
        referenceId,
      },
    });

    return { balance: updated.credits };
  });
}

/** Grant positive credits (bonuses, purchases). Idempotent when `referenceId` + `type` already exist. */
export async function grantCredits(params: {
  userId: string;
  amount: number;
  type: CreditType;
  description?: string;
  referenceId?: string;
}): Promise<{ balance: number; duplicate: boolean }> {
  const { userId, amount, type, description, referenceId } = params;

  if (amount <= 0) {
    const balance = await getUserCreditBalance(userId);
    return { balance, duplicate: false };
  }

  return prisma.$transaction(async (tx) => {
    if (referenceId) {
      const existing = await tx.creditTransaction.findFirst({
        where: { userId, type, referenceId },
      });
      if (existing) {
        const u = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        return { balance: u?.credits ?? 0, duplicate: true };
      }
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
        totalCreditsEarned: { increment: amount },
      },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        referenceId,
      },
    });

    return { balance: updated.credits, duplicate: false };
  });
}
