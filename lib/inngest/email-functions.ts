import { renderAndSend } from "@/lib/email/send";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 1000;

async function hasEmailOptedIn(userId: string): Promise<boolean> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { emailNotifications: true },
  });
  return settings?.emailNotifications ?? false;
}

async function nonDigestCountLastSevenDays(userId: string): Promise<number> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS);
  return prisma.engagementLog.count({
    where: {
      userId,
      campaign: { not: "weekly-digest" },
      sentAt: { gte: since },
    },
  });
}

async function nonDigestCountLastThirtyDays(userId: string): Promise<number> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  return prisma.engagementLog.count({
    where: {
      userId,
      campaign: { not: "weekly-digest" },
      sentAt: { gte: since },
    },
  });
}

async function logEngagementSend({
  userId,
  campaign,
  period,
}: {
  userId: string;
  campaign: string;
  period?: string;
}) {
  const periodKey = period ?? new Date().toISOString().slice(0, 10);
  await prisma.engagementLog.upsert({
    where: { userId_campaign_period: { userId, campaign, period: periodKey } },
    create: { userId, campaign, period: periodKey },
    update: { sentAt: new Date() },
  });
}

export const sendEmailTransactional = inngest.createFunction(
  {
    name: "Send Transactional Email",
    id: "send-email-transactional",
    triggers: { event: "email.send.transactional" },
  },
  async ({ event, step }) => {
    const { template, to, props, headers } = event.data as {
      template: string;
      to: string;
      props: Record<string, unknown>;
      headers?: Record<string, string>;
    };
    return step.run("send-email", async () => {
      return renderAndSend({ template, to, props, headers });
    });
  },
);

export const sendEmailLifecycle = inngest.createFunction(
  {
    name: "Send Lifecycle Email",
    id: "send-email-lifecycle",
    triggers: { event: "email.send.lifecycle" },
  },
  async ({ event, step }) => {
    const { template, to, props, userId } = event.data as {
      template: string;
      to: string;
      props: Record<string, unknown>;
      userId?: string;
    };
    const optedIn = await step.run("check-opt-in", async () => {
      if (!userId) return true;
      return hasEmailOptedIn(userId);
    });
    if (!optedIn) {
      return { skipped: true, reason: "not opted in" };
    }
    return step.run("send-email", async () => {
      return renderAndSend({ template, to, props });
    });
  },
);

export const sendEmailPayment = inngest.createFunction(
  {
    name: "Send Payment Email",
    id: "send-email-payment",
    triggers: { event: "email.send.payment" },
  },
  async ({ event, step }) => {
    const { template, to, props } = event.data as {
      template: string;
      to: string;
      props: Record<string, unknown>;
    };
    return step.run("send-email", async () => {
      return renderAndSend({ template, to, props });
    });
  },
);

export const sendEmailCampaign = inngest.createFunction(
  {
    name: "Send Campaign Email",
    id: "send-email-campaign",
    triggers: { event: "email.send.campaign" },
  },
  async ({ event, step }) => {
    const { template, to, props, userId } = event.data as {
      template: string;
      to: string;
      props: Record<string, unknown>;
      userId?: string;
    };

    if (userId) {
      const allowed = await step.run("check-frequency", async () => {
        if (!(await hasEmailOptedIn(userId))) {
          return { ok: false as const, reason: "not opted in" };
        }
        const count7 = await nonDigestCountLastSevenDays(userId);
        if (count7 >= 2) {
          return { ok: false as const, reason: "frequency cap 7 days" };
        }
        const count30 = await nonDigestCountLastThirtyDays(userId);
        if (count30 >= 10) {
          return { ok: false as const, reason: "frequency cap 30 days" };
        }
        return { ok: true as const, reason: null };
      });
      if (!allowed.ok) {
        return { skipped: true, reason: allowed.reason };
      }
    }

    const result = await step.run("send-email", async () => {
      return renderAndSend({ template, to, props });
    });

    if (userId) {
      await step.run("log-send", async () => {
        if (template === "weekly-digest") {
          await logEngagementSend({
            userId,
            campaign: "weekly-digest",
            period: new Date().toISOString().slice(0, 10),
          });
        } else {
          await logEngagementSend({ userId, campaign: template });
        }
        return { logged: true };
      });
    }

    return result;
  },
);

export const sendWeeklyDigest = inngest.createFunction(
  {
    name: "Send Weekly Digest",
    id: "send-weekly-digest",
    triggers: { cron: "0 8 * * 1" },
  },
  async ({ step }) => {
    console.log("[Inngest] Running weekly digest dispatch...");
    const recipients = await step.run("find-recipients", async () => {
      const users = await prisma.user.findMany({
        where: {
          emailVerified: true,
          role: "USER",
        },
        select: { id: true, email: true, name: true },
        take: 200,
      });
      return users;
    });

    let sent = 0;
    let skipped = 0;
    for (const user of recipients) {
      const outcome = await step.run(`send-digest-to-${user.id}`, async () => {
        try {
          if (!(await hasEmailOptedIn(user.id))) {
            return { sent: false as const, reason: "not opted in" };
          }
          const count7 = await nonDigestCountLastSevenDays(user.id);
          if (count7 >= 2) {
            return { sent: false as const, reason: "frequency cap 7 days" };
          }
          await renderAndSend({
            template: "weekly-digest",
            to: user.email,
            props: {
              firstName: user.name || "Student",
              streak: 0,
              quizzes: 0,
              reportUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/quizzes`,
              unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/settings`,
              weekOf: new Date().toISOString().slice(0, 10),
            },
          });
          await logEngagementSend({
            userId: user.id,
            campaign: "weekly-digest",
            period: new Date().toISOString().slice(0, 10),
          });
          return { sent: true as const, reason: null };
        } catch (error) {
          console.error(
            `[Inngest] Digest send failed for ${user.email}:`,
            error,
          );
          return { sent: false as const, reason: "error" };
        }
      });
      if (outcome.sent) {
        sent++;
      } else {
        skipped++;
      }
    }
    return { success: true, sent, skipped, total: recipients.length };
  },
);
