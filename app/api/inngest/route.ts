import { serve } from "inngest/next";
import {} from "@/lib/inngest";
import { pruneAppCache } from "@/lib/inngest/cache-cleanup-functions";
import { inngest } from "@/lib/inngest/client";
import { dispatchEngagementCampaigns } from "@/lib/inngest/engagement-functions";
import {
  deleteUnverifiedAccounts,
  generateAdminReport,
  generateChatTitle,
  generateQuiz,
  handleSubscriptionAction,
  monthlyCreditBonus,
  processNote,
  sendAdminInviteEmail,
  sendContactEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendPlatformUpdateEmail,
  sendRoleUpdateEmail,
  sendSignInEmail,
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
    sendSignInEmail,
    sendContactEmail,
    generateChatTitle,
    generateAdminReport,
    dispatchEngagementCampaigns,
    pruneAppCache,
  ],
});
