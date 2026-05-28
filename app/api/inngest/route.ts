import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  processNote,
  generateQuiz,
  generateQuizFromWeakAreas,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendMagicLinkEmail,
  sendUnverifiedWarning,
  deleteUnverifiedAccounts,
  sendAdminInviteEmail,
  sendRoleUpdateEmail,
  generateDefaultQuiz,
  sendPlatformUpdateEmail,
  handleSubscriptionAction,
  monthlyCreditBonus,
} from "@/lib/inngest/functions";
import {
  processPaper3Source,
  generatePaper3Mock,
  harvestNoteKnowledge,
  harvestPaper3Knowledge,
  ingestQuestions,
} from "@/lib/inngest";
import { evaluatePaper3Exam } from "@/lib/inngest/paper3-exam-functions";
import { computeDailyMetricsJob } from "@/lib/inngest/metrics-functions";
import { dispatchEngagementCampaigns } from "@/lib/inngest/engagement-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processNote,
    generateQuiz,
    generateQuizFromWeakAreas,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendMagicLinkEmail,
    sendUnverifiedWarning,
    deleteUnverifiedAccounts,
    sendAdminInviteEmail,
    sendRoleUpdateEmail,
    generateDefaultQuiz,
    sendPlatformUpdateEmail,
    handleSubscriptionAction,
    monthlyCreditBonus,
    processPaper3Source,
    generatePaper3Mock,
    evaluatePaper3Exam,
    harvestNoteKnowledge,
    harvestPaper3Knowledge,
    ingestQuestions,
    computeDailyMetricsJob,
    dispatchEngagementCampaigns,
  ],
});
