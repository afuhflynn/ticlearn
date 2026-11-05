import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export const expirePartnerInvites = inngest.createFunction(
  {
    name: "Expire partner invites",
    id: "expire-partner-invites",
    triggers: { cron: "0 3 * * *" },
  },
  async ({ step }) => {
    const now = new Date();
    const expired = await step.run("expire-invites", async () => {
      return prisma.partnerInvite.updateMany({
        where: { status: "PENDING", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      });
    });
    return { success: true, expired: expired.count };
  },
);
