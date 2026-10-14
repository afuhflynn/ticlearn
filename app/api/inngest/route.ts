import { serve } from "inngest/next";
import {} from "@/lib/inngest";
import { inngest } from "@/lib/inngest/client";
import { dispatchEngagementCampaigns } from "@/lib/inngest/engagement-functions";
import {
  deleteUnverifiedAccounts,
  generateQuiz,
  handleSubscriptionAction,
  monthlyCreditBonus,
  processNote,
  sendAdminInviteEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendPlatformUpdateEmail,
  sendRoleUpdateEmail,
  sendUnverifiedWarning,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/inngest/functions";
import { computeDailyMetricsJob } from "@/lib/inngest/metrics-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processNote,
    generateQuiz,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendMagicLinkEmail,
    sendUnverifiedWarning,
    deleteUnverifiedAccounts,
    sendAdminInviteEmail,
    sendRoleUpdateEmail,
    sendPlatformUpdateEmail,
    handleSubscriptionAction,
    monthlyCreditBonus,
    computeDailyMetricsJob,
    dispatchEngagementCampaigns,
  ],
});
