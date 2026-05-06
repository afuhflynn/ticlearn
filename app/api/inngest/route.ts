import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
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
  generateDefaultQuiz,
  sendPlatformUpdateEmail,
  handleSubscriptionAction,
} from "@/lib/inngest/functions";
import { processPaper3Source, generatePaper3Mock } from "@/lib/inngest";

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
    generateDefaultQuiz,
    sendPlatformUpdateEmail,
    handleSubscriptionAction,
    processPaper3Source,
    generatePaper3Mock,
  ],
});
