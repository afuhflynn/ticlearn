import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromWord,
  summarizeText,
} from "@/lib/ai";
import { grantCredits } from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { attachTopicsToNote } from "@/lib/topics";

export const processNote = inngest.createFunction(
  {
    name: "Process Note",
    id: "process-note",
    triggers: {
      event: "note/process",
    },
    concurrency: {
      limit: 4,
      key: "note-processing",
    },
  },

  async ({ event, step }) => {
    const { noteId } = event.data;
    console.log(`Processing note: ${noteId}`);

    try {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        console.error(`Note not found: ${noteId}`);
        return { success: false, error: "Note not found" };
      }

      await prisma.note.update({
        where: { id: noteId },
        data: { status: "PROCESSING" },
      });

      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: note.userId },
      });
      const language = userSettings?.language ?? "eng";
      console.log(`[Inngest] Using language for OCR: ${language}`);

      console.log(
        `[Inngest] Note fileType: ${note.fileType}, fileUrl: ${note.fileUrl}`,
      );

      const timeoutMs = 120000; // 2 minutes
      let extractedText: string;

      const extractWithTimeout = async (
        extractionFn: () => Promise<string>,
        timeout: number,
      ): Promise<string> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(`OCR timed out after ${timeout / 1000} seconds`),
              ),
            timeout,
          );
        });
        return Promise.race([extractionFn(), timeoutPromise]);
      };

      console.log(
        `[Inngest] Starting extraction for fileType: ${note.fileType}, uploadthingKey: ${note.uploadthingKey ? note.uploadthingKey.substring(0, 30) + "..." : "MISSING"}`,
      );

      switch (note.fileType) {
        case "PDF":
          console.log("[Inngest] Extracting PDF text...");
          if (!note.uploadthingKey) {
            throw new Error("Cannot process PDF: uploadthingKey is missing");
          }
          extractedText = await extractWithTimeout(
            () => extractTextFromPDF(note.uploadthingKey!, language),
            timeoutMs,
          );
          break;
        case "IMAGE":
          console.log("[Inngest] Extracting IMAGE text...");
          extractedText = await extractWithTimeout(
            () =>
              extractTextFromImage(
                note.uploadthingKey || undefined,
                note.fileUrl,
                language,
              ),
            timeoutMs,
          );
          break;
        case "WORD":
          console.log("[Inngest] Extracting WORD text...");
          extractedText = await extractTextFromWord(
            note.uploadthingKey || undefined,
            note.fileUrl,
          );
          break;
        default:
          throw new Error(`Unsupported file type: ${note.fileType}`);
      }

      console.log(
        `[Inngest] Extraction result length: ${extractedText?.length || 0}`,
      );

      if (!extractedText || extractedText.length < 100) {
        throw new Error(
          `Text extraction returned too little content (got ${extractedText?.length || 0} chars)`,
        );
      }

      console.log("[Inngest] Generating summary...");
      const summaryResult = await summarizeText(extractedText, note.userId);

      console.log("[Inngest] Attaching topics to the note...");
      await attachTopicsToNote(noteId, summaryResult.topics);

      console.log("[Inngest] Updating note in database...");
      await prisma.note.update({
        where: { id: noteId },
        data: {
          extractedText,
          summary: summaryResult.summary,
          keyPoints: summaryResult.keyPoints,
          status: "READY",
        },
      });

      console.log(`Note processed successfully: ${noteId}`);

      return { success: true, noteId };
    } catch (error) {
      console.error("Note processing error:", error);
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Unknown error",
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack",
      );

      await prisma.note.update({
        where: { id: noteId },
        data: { status: "ERROR" },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      };
    }
  },
);

export const generateQuiz = inngest.createFunction(
  {
    name: "Generate Quiz",
    id: "generate-quiz",
    triggers: {
      event: "quiz/generate",
    },
  },
  async ({ event }) => {
    const { noteId, quizId, questionCount, questionTypes } = event.data;
    console.log(
      `[Inngest] Generating quiz for note: ${noteId}, quiz: ${quizId}`,
    );
    console.log(
      `[Inngest] Options: ${questionCount} questions, type: ${questionTypes}`,
    );

    try {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note || !note.extractedText) {
        console.error(
          `[Inngest] Note not found or no extracted text for noteId: ${noteId}`,
        );
        throw new Error("Note or extracted text not found");
      }

      console.log(
        `[Inngest] Note extracted text length: ${note.extractedText.length} chars`,
      );

      const { generateQuizFromNote } = await import("@/lib/ai");
      console.log(`[Inngest] Calling AI to generate quiz...`);

      const generatedQuestions = await generateQuizFromNote(
        note.extractedText,
        {
          questionCount: questionCount || 10,
          questionTypes: questionTypes || "MIXED",
        },
        note.userId,
      );

      console.log(
        `[Inngest] AI returned ${generatedQuestions.length} questions`,
      );

      if (generatedQuestions.length === 0) {
        console.error(
          `[Inngest] AI returned 0 questions - marking quiz as ERROR`,
        );
        await prisma.quiz.update({
          where: { id: quizId },
          data: { status: "ERROR" },
        });
        return { success: false, error: "AI returned no questions" };
      }

      console.log(
        `[Inngest] Sample question:`,
        JSON.stringify(generatedQuestions[0], null, 2),
      );

      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          questionCount: generatedQuestions.length,
          status: "READY",
          questions: {
            create: generatedQuestions.map((q, index) => ({
              type: q.type,
              question: q.question,
              options: q.type === "MCQ" ? q.options : [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              order: index,
            })),
          },
        },
      });

      console.log(`[Inngest] Quiz generated and saved successfully: ${quizId}`);
      return { success: true, quizId };
    } catch (error) {
      console.error(`[Inngest] Quiz generation failed:`, error);

      await prisma.quiz.update({
        where: { id: quizId },
        data: { status: "ERROR" },
      });

      return { success: false, error: "Quiz generation failed" };
    }
  },
);

export const sendVerificationEmail = inngest.createFunction(
  {
    name: "Send Verification Email",
    id: "send-verification-email",
    triggers: {
      event: "email.send.verification",
    },
  },
  async ({ event }) => {
    const { email, name, otp } = event.data;
    console.log(`Sending verification email to: ${email}`);

    try {
      const { sendVerificationEmail } = await import("@/lib/email/send");
      await sendVerificationEmail({ email, name, otp });

      return { success: true };
    } catch (error) {
      console.error("Email send error:", error);
      return { success: false, error: "Failed to send email" };
    }
  },
);

export const sendWelcomeEmail = inngest.createFunction(
  {
    name: "Send Welcome Email",
    id: "send-welcome-email",
    triggers: {
      event: "email.send.welcome",
    },
  },
  async ({ event }) => {
    const { email, name } = event.data;
    console.log(`Sending welcome email to: ${email}`);

    try {
      const { sendWelcomeEmail } = await import("@/lib/email/send");
      await sendWelcomeEmail({ email, name });

      return { success: true };
    } catch (error) {
      console.error("Welcome email send error:", error);
      return { success: false, error: "Failed to send welcome email" };
    }
  },
);

export const sendPasswordResetEmail = inngest.createFunction(
  {
    name: "Send Password Reset Email",
    id: "send-password-reset-email",
    triggers: {
      event: "email.send.password-reset",
    },
  },
  async ({ event }) => {
    const { email, name, otp } = event.data;
    console.log(`Sending password reset email to: ${email}`);

    try {
      const { sendPasswordResetEmail } = await import("@/lib/email/send");
      await sendPasswordResetEmail({ email, name, otp });

      return { success: true };
    } catch (error) {
      console.error("Password reset email send error:", error);
      return { success: false, error: "Failed to send password reset email" };
    }
  },
);

export const sendMagicLinkEmail = inngest.createFunction(
  {
    name: "Send Magic Link Email",
    id: "send-magic-link-email",
    triggers: {
      event: "email.send.magic-link",
    },
  },
  async ({ event }) => {
    const { email, name, magicLink } = event.data;
    console.log(`Sending magic link email to: ${email}`);

    try {
      const { sendEmail } = await import("@/lib/email/send");
      const subject = "Your TiCLearn magic link";
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Link</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 32px; text-align: center; }
    .button { display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .button:hover { background: #6d28d9; }
    .footer { padding: 24px 32px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
    .footer a { color: #7c3aed; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Sign In to TiCLearn</h2>
        <p>Hi ${name || "Student"},</p>
        <p>Click the button below to sign in to your TiCLearn account:</p>
        <a href="${magicLink}" class="button">Sign In →</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
      await sendEmail({ to: email, subject, html });

      return { success: true };
    } catch (error) {
      console.error("Magic link email send error:", error);
      return { success: false, error: "Failed to send magic link email" };
    }
  },
);

export const sendAdminInviteEmail = inngest.createFunction(
  {
    name: "Send Admin Invite Email",
    id: "send-admin-invite-email",
    triggers: {
      event: "email.send.admin-invite",
    },
  },
  async ({ event }) => {
    const { email, inviterName, inviteLink } = event.data;
    console.log(`Sending admin invite email to: ${email}`);

    try {
      const { sendAdminInvitationEmail } = await import("@/lib/email/send");
      await sendAdminInvitationEmail({ email, inviterName, inviteLink });

      return { success: true };
    } catch (error) {
      console.error("Admin invite email send error:", error);
      return { success: false, error: "Failed to send admin invite email" };
    }
  },
);

export const sendRoleUpdateEmail = inngest.createFunction(
  {
    name: "Send Role Update Email",
    id: "send-role-update-email",
    triggers: {
      event: "email.send.role-update",
    },
  },
  async ({ event }) => {
    const { email, name, newRole } = event.data;
    console.log(`Sending role update email to: ${email}`);

    try {
      const { sendRoleUpdateEmail } = await import("@/lib/email/send");
      await sendRoleUpdateEmail({ email, name, newRole });

      return { success: true };
    } catch (error) {
      console.error("Role update email send error:", error);
      return { success: false, error: "Failed to send role update email" };
    }
  },
);

export const sendUnverifiedWarning = inngest.createFunction(
  {
    name: "Send Unverified Account Warnings",
    id: "send-unverified-warnings",
    triggers: {
      cron: "0 8 * * 0",
    },
  },
  async () => {
    console.log("[Inngest] Running weekly unverified account warning job...");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const usersToWarn = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lt: sevenDaysAgo },
        warningSentAt: null,
        accounts: {
          none: {},
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    console.log(`[Inngest] Found ${usersToWarn.length} users to warn`);

    const { sendUnverifiedWarningEmail } = await import("@/lib/email/send");
    let sentCount = 0;

    for (const user of usersToWarn) {
      try {
        await sendUnverifiedWarningEmail({
          email: user.email,
          name: user.name || "Student",
          daysLeft: 7,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { warningSentAt: new Date() },
        });

        sentCount++;
        console.log(`[Inngest] Sent warning to: ${user.email}`);
      } catch (error) {
        console.error(
          `[Inngest] Failed to send warning to ${user.email}:`,
          error,
        );
      }
    }

    return { success: true, warned: sentCount, total: usersToWarn.length };
  },
);

export const deleteUnverifiedAccounts = inngest.createFunction(
  {
    name: "Delete Unverified Accounts",
    id: "delete-unverified-accounts",
    triggers: {
      cron: "0 9 * * 0",
    },
  },
  async () => {
    console.log("[Inngest] Running weekly unverified account deletion job...");

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const usersToDelete = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lt: fourteenDaysAgo },
        warningSentAt: { not: null },
        accounts: {
          none: {},
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`[Inngest] Found ${usersToDelete.length} users to delete`);

    let deletedCount = 0;

    for (const user of usersToDelete) {
      try {
        await prisma.user.delete({
          where: { id: user.id },
        });

        deletedCount++;
        console.log(`[Inngest] Deleted unverified user: ${user.email}`);
      } catch (error) {
        console.error(`[Inngest] Failed to delete user ${user.email}:`, error);
      }
    }

    return {
      success: true,
      deleted: deletedCount,
      total: usersToDelete.length,
    };
  },
);

export const sendPlatformUpdateEmail = inngest.createFunction(
  {
    name: "Send Platform Update Email",
    id: "send-platform-update-email",
    triggers: [{ event: "email.platform-update" }, { cron: "0 5 * * 1" }],
  },

  async () => {
    console.log("[Inngest] Running platform update email job (cron run)...");

    const users = await prisma.user.findMany({
      where: {
        emailVerified: true,
        role: { not: "ADMIN" },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      take: 50,
    });

    console.log(`[Inngest] Found ${users.length} users to email`);

    const { sendPlatformUpdateEmail } = await import("@/lib/email/send");
    let sentCount = 0;

    for (const user of users) {
      try {
        await sendPlatformUpdateEmail({
          email: user.email,
          name: user.name || "Student",
        });

        sentCount++;
        console.log(`[Inngest] Sent platform update to: ${user.email}`);

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(
          `[Inngest] Failed to send email to ${user.email}:`,
          error,
        );
      }
    }

    return { success: true, sent: sentCount, total: users.length };
  },
);

export const handleSubscriptionAction = inngest.createFunction(
  {
    name: "Handle Subscription Action",
    id: "handle-subscription-action",
    triggers: {
      event: "subscription/action",
    },
  },
  async ({ event }) => {
    const { subscriptionId, action, planLabel, amount, transactionId, reason } =
      event.data;

    console.log(
      `[Inngest] Processing subscription action: ${action} for ${subscriptionId}`,
    );

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      console.error(`[Inngest] Subscription not found: ${subscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: subscription.userId },
    });

    if (!user) {
      console.error(`[Inngest] User not found: ${subscription.userId}`);
      return { success: false, error: "User not found" };
    }

    if (action === "ACTIVATE") {
      const { sendSubscriptionActivatedEmail } =
        await import("@/lib/email/send");

      await sendSubscriptionActivatedEmail({
        email: user.email,
        name: user.name || "Student",
        planLabel: planLabel || subscription.plan,
        amount: amount || subscription.amount,
        transactionId: transactionId || subscription.fapshiTransId || "N/A",
      });

      console.log(`[Inngest] Sent activation email to: ${user.email}`);
      return { success: true, action: "ACTIVATE" };
    }

    if (action === "REJECT") {
      const { sendSubscriptionRejectedEmail } =
        await import("@/lib/email/send");

      await sendSubscriptionRejectedEmail({
        email: user.email,
        name: user.name || "Student",
        planLabel: planLabel || subscription.plan,
        reason: reason || "Transaction could not be verified",
      });

      console.log(`[Inngest] Sent rejection email to: ${user.email}`);
      return { success: true, action: "REJECT" };
    }

    return { success: false, error: "Unknown action" };
  },
);

export const monthlyCreditBonus = inngest.createFunction(
  {
    name: "Monthly Credit Bonus",
    id: "monthly-credit-bonus",
    triggers: {
      cron: "0 0 1 * *",
    },
  },
  async () => {
    console.log("[Inngest] Running monthly credit bonus job...");

    const BONUS_MAP: Record<string, number> = {
      STARTER: 400,
      STANDARD: 1_200,
      PREMIUM: 3_000,
      PRO: 3_000,
    };

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        plan: { in: ["STARTER", "STANDARD", "PREMIUM", "PRO"] },
      },
      select: {
        id: true,
        userId: true,
        plan: true,
      },
    });

    console.log(`[Inngest] Found ${subscriptions.length} active subscribers`);

    const { grantCredits } = await import("@/lib/credits");
    let grantedCount = 0;
    let errorCount = 0;

    for (const sub of subscriptions) {
      const bonus = BONUS_MAP[sub.plan];
      if (!bonus) continue;

      try {
        const result = await grantCredits({
          userId: sub.userId,
          amount: bonus,
          type: "BONUS",
          description: `Monthly credit bonus — ${sub.plan} plan (${bonus} credits)`,
          referenceId: `bonus-${sub.id}-${new Date().toISOString().slice(0, 7)}`,
        });

        if (!result.duplicate) {
          grantedCount++;
          console.log(
            `[Inngest] Granted ${bonus} credits to user ${sub.userId} (${sub.plan})`,
          );
        }
      } catch (error) {
        errorCount++;
        console.error(
          `[Inngest] Failed to grant bonus for user ${sub.userId}:`,
          error,
        );
      }
    }

    console.log(
      `[Inngest] Monthly credit bonus complete: ${grantedCount} granted, ${errorCount} errors`,
    );
    return { success: true, granted: grantedCount, errors: errorCount };
  },
);

export { inngest };
