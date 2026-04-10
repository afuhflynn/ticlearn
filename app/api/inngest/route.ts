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
} from "@/lib/inngest/functions";

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
  ],
});
