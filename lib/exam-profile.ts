import { prisma } from "./prisma";

export async function getActiveProfileId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user as { activeProfileId?: string | null })?.activeProfileId ?? null;
}
