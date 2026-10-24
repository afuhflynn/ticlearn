import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isTemplate, TEMPLATES } from "./templates";
import { getTransporter } from "./transport";

const LOGO_CID = "logo@ticlearn.ticsummit.org";
const LOGO_PATH = path.join(process.cwd(), "lib/email/assets/logo.png");

function getLogoAttachment() {
  try {
    const content = fs.readFileSync(LOGO_PATH);
    return {
      filename: "logo.png",
      content,
      contentType: "image/png",
      cid: LOGO_CID,
      contentDisposition: "inline" as const,
    };
  } catch {
    return null;
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

export class SuppressionError extends Error {
  constructor(email: string) {
    super(`Address ${email} is suppressed and cannot receive email`);
    this.name = "SuppressionError";
  }
}

export async function isSuppressed(email: string): Promise<boolean> {
  const row = await prisma.emailSuppression.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(row);
}

export async function sendEmail(options: SendEmailOptions) {
  const suppressed = await isSuppressed(options.to);
  if (suppressed) {
    throw new SuppressionError(options.to);
  }

  const transporter = getTransporter();
  try {
    const logo = getLogoAttachment();
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      headers: options.headers,
      attachments: logo ? [logo] : [],
    });
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    const msg = String(error);
    if (
      /550|551|552|553|554|user unknown|mailbox unavailable|no such user/i.test(
        msg,
      )
    ) {
      try {
        await prisma.emailSuppression.upsert({
          where: { email: options.to },
          create: { email: options.to, reason: "BOUNCED" },
          update: { reason: "BOUNCED" },
        });
      } catch (e) {
        console.error("Suppression upsert failed:", e);
      }
    }
    // Rethrow so Inngest retries the send instead of silently succeeding.
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function sendRenderedEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    headers: options.headers,
  });
}

/** Render a template via the registry and send it through the suppression-aware transporter. */
export async function renderAndSend({
  template,
  to,
  props,
  headers,
}: {
  template: string;
  to: string;
  props: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  if (!isTemplate(template)) {
    throw new Error(`Unknown email template: ${template}`);
  }
  const { subject, html, text } = TEMPLATES[template].render(props);
  return sendEmail({ to, subject, html, text, headers });
}

export type CampaignType =
  | "re-engagement"
  | "streak-risk"
  | "onboarding-incomplete"
  | "weekly-digest";
