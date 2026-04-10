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
  ],
});
