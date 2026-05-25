import { prisma } from "./prisma";

export async function getActiveProfileId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return (user as { activeProfileId?: string | null })?.activeProfileId ?? null;
}

/** Active profile, or the user’s oldest profile (for admin tools that need a profile). */
export async function getAnyExamProfileIdForUser(
  userId: string,
): Promise<string | null> {
  const active = await getActiveProfileId(userId);
  if (active) return active;
  const first = await prisma.examProfile.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}
