import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function newPartnerToken(): string {
  return randomBytes(32).toString("hex");
}

function randomCode(): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `TIC-${suffix}`;
}

export async function generateUniqueAffiliateCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const existing = await prisma.affiliate.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `TIC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
