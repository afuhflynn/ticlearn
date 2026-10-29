import { serve } from "inngest/next";
import { pruneAppCache } from "@/lib/inngest/cache-cleanup-functions";
import { inngest } from "@/lib/inngest/client";
import {
  sendEmailCampaign,
  sendEmailLifecycle,
  sendEmailPayment,
  sendEmailTransactional,
  sendWeeklyDigest,
} from "@/lib/inngest/email-functions";
import { dispatchEngagementCampaigns } from "@/lib/inngest/engagement-functions";
import {
  deleteUnverifiedAccounts,
  generateAdminReport,
  generateChatTitle,
  generateQuiz,
  handleSubscriptionAction,
  monthlyCreditBonus,
  processNote,
} from "@/lib/inngest/functions";
import { computeDailyMetricsJob } from "@/lib/inngest/metrics-functions";
import { visualAnalysisProcess } from "@/lib/inngest/visual-analysis-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processNote,
    generateQuiz,
    sendEmailTransactional,
    sendEmailLifecycle,
    sendEmailPayment,
    sendEmailCampaign,
    sendWeeklyDigest,
    deleteUnverifiedAccounts,
    handleSubscriptionAction,
    monthlyCreditBonus,
    computeDailyMetricsJob,
    generateChatTitle,
    generateAdminReport,
    dispatchEngagementCampaigns,
    pruneAppCache,
    visualAnalysisProcess,
  ],
});
