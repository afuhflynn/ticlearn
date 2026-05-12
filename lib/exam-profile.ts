import { prisma } from "./prisma";

export async function getActiveProfileId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });
  return user?.activeProfileId ?? null;
}
