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
} from "@/lib/inngest/functions";
import { processPaper3Source, generatePaper3Mock } from "@/lib/inngest";
import { evaluatePaper3Exam } from "@/lib/inngest/paper3-exam-functions";
import { harvestNoteKnowledge, harvestPaper3Knowledge } from "@/lib/inngest/knowledge-harvest";

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
    processPaper3Source,
    generatePaper3Mock,
    evaluatePaper3Exam,
    harvestNoteKnowledge,
    harvestPaper3Knowledge,
  ],
});
