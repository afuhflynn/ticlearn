import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export const expirePartnerInvites = inngest.createFunction(
  {
    name: "Expire partner invites",
    id: "expire-partner-invites",
    triggers: { cron: "0 3 * * *" },
  },
  async () => {
    const now = new Date();
    const result = await prisma.partnerInvite.updateMany({
      where: { status: "PENDING", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    return { success: true, expired: result.count };
  },
);
