import type { CampaignType } from "@/lib/email/send";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const _BATCH_SIZE = 50;
const CAMPAIGN_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2_000;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function logEngagement(
  userId: string,
  campaign: string,
  period: string = new Date().toISOString().slice(0, 10),
) {
  await prisma.engagementLog.upsert({
    where: { userId_campaign_period: { userId, campaign, period } },
    create: { userId, campaign, period },
    update: { sentAt: new Date() },
  });
}

async function hasBeenSent(
  userId: string,
  campaign: string,
  period: string = new Date().toISOString().slice(0, 10),
): Promise<boolean> {
  const existing = await prisma.engagementLog.findUnique({
    where: { userId_campaign_period: { userId, campaign, period } },
  });
  return existing !== null;
}

async function hasEmailOptedIn(userId: string): Promise<boolean> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { emailNotifications: true },
  });
  return settings?.emailNotifications ?? false;
}

export const dispatchEngagementCampaigns = inngest.createFunction(
  {
    name: "Dispatch Engagement Campaigns",
    id: "dispatch-engagement-campaigns",
    triggers: { cron: "0 10 * * 1" },
  },
  async () => {
    console.log("[Inngest] Starting engagement campaign dispatch...");

    const period = new Date().toISOString().slice(0, 10);

    const campaignPipeline: Array<{
      campaign: CampaignType;
      label: string;
      findUsers: () => Promise<string[]>;
    }> = [
      {
        campaign: "onboarding-incomplete",
        label: "Onboarding incomplete",
        findUsers: async () => {
          const threeDaysAgo = new Date(Date.now() - THREE_DAYS_MS);
          const users = await prisma.user.findMany({
            where: {
              role: "USER",
              createdAt: { lt: threeDaysAgo },
              onboardingCompleted: false,
              onboardingSkipped: false,
            },
            select: { id: true },
            take: CAMPAIGN_BATCH_SIZE,
          });
          return users.map((u) => u.id);
        },
      },
      {
        campaign: "re-engagement",
        label: "Re-engagement",
        findUsers: async () => {
          const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
          const users = await prisma.user.findMany({
            where: {
              role: "USER",
              kpiEvents: {
                some: { createdAt: { lt: sevenDaysAgo } },
                none: { createdAt: { gte: sevenDaysAgo } },
              },
              onboardingCompleted: true,
            },
            select: { id: true },
            take: CAMPAIGN_BATCH_SIZE,
          });
          return users.map((u) => u.id);
        },
      },
      {
        campaign: "streak-risk",
        label: "Streak risk",
        findUsers: async () => {
          const twoDaysAgo = new Date(Date.now() - TWO_DAYS_MS);
          const users = await prisma.user.findMany({
            where: {
              role: "USER",
              userStats: {
                some: {
                  currentStreak: { gte: 3 },
                  lastActivityDate: { lt: twoDaysAgo },
                },
              },
              onboardingCompleted: true,
            },
            select: { id: true },
            take: CAMPAIGN_BATCH_SIZE,
          });
          return users.map((u) => u.id);
        },
      },
      {
        campaign: "weak-topic-drill",
        label: "Weak topic drill",
        findUsers: async () => {
          const users = await prisma.user.findMany({
            where: {
              role: "USER",
              notes: {
                some: {
                  topicPerformances: {
                    some: { masteryScore: { lt: 70 } },
                  },
                },
              },
              onboardingCompleted: true,
            },
            select: { id: true },
            take: CAMPAIGN_BATCH_SIZE,
          });
          return users.map((u) => u.id);
        },
      },
      {
        campaign: "weekly-digest",
        label: "Weekly digest",
        findUsers: async () => {
          const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
          const users = await prisma.user.findMany({
            where: {
              role: "USER",
              kpiEvents: { some: { createdAt: { gte: sevenDaysAgo } } },
              onboardingCompleted: true,
            },
            select: { id: true },
            take: 100,
          });
          return users.map((u) => u.id);
        },
      },
    ];

    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const results: Record<
      string,
      { sent: number; skipped: number; errors: number }
    > = {};

    for (const { campaign, label, findUsers } of campaignPipeline) {
      console.log(`[Inngest] Processing campaign: ${label} (${campaign})`);
      const sent: string[] = [];
      const skipped: string[] = [];
      const errors: string[] = [];

      try {
        const candidateIds = await findUsers();
        console.log(`[Inngest]   Found ${candidateIds.length} candidates`);

        for (const userId of candidateIds) {
          const [alreadySent, optedIn] = await Promise.all([
            hasBeenSent(userId, campaign, period),
            hasEmailOptedIn(userId),
          ]);

          if (alreadySent) {
            skipped.push(userId);
            continue;
          }

          if (!optedIn) {
            skipped.push(userId);
            continue;
          }

          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
          });
          if (!user) {
            skipped.push(userId);
            continue;
          }

          try {
            await inngest.send({
              name: "email.send.campaign",
              data: {
                template: campaign,
                to: user.email,
                props: {
                  firstName: user.name || "Student",
                  streak: 0,
                  quizzes: 0,
                  readinessPct: 0,
                  weakestTopic: "your studies",
                  deltaPct: 0,
                  reportUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/quizzes`,
                  unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/settings`,
                },
                userId,
              },
            });
            await logEngagement(userId, campaign, period);
            sent.push(userId);
          } catch (err) {
            console.error(
              `[Inngest]   Failed to send ${campaign} to user ${userId}:`,
              err,
            );
            errors.push(userId);
          }
        }
      } catch (err) {
        console.error(`[Inngest]   Campaign ${campaign} query failed:`, err);
        errors.push("query_error");
      }

      results[campaign] = {
        sent: sent.length,
        skipped: skipped.length,
        errors: errors.length,
      };
      totalSent += sent.length;
      totalSkipped += skipped.length;
      totalErrors += errors.length;

      console.log(
        `[Inngest]   ${label} done: ${sent.length} sent, ${skipped.length} skipped, ${errors.length} errors`,
      );

      if (campaign !== campaignPipeline[campaignPipeline.length - 1].campaign) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    console.log(
      `[Inngest] Engagement campaign dispatch complete: ${totalSent} sent, ${totalSkipped} skipped, ${totalErrors} errors`,
    );

    return {
      success: true,
      totalSent,
      totalSkipped,
      totalErrors,
      results,
    };
  },
);
