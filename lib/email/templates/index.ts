import { render as comeBack } from "./come-back";
import { render as examCountdown } from "./exam-countdown";
import { render as adminInvite } from "./internal/admin-invite";
import { render as adminPaymentAlert } from "./internal/admin-payment-alert";
import { render as adminRoleUpdate } from "./internal/admin-role-update";
import { render as passwordReset } from "./password-reset";
import { render as partnerInvite } from "./partner-invite";
import { render as paymentFailed } from "./payment-failed";
import { render as paymentReceived } from "./payment-received";
import { render as referralReward } from "./referral-reward";
import { render as signInCode } from "./sign-in-code";
import { render as subscriptionEnding } from "./subscription-ending";
import { render as verifyAddress } from "./verify-address";
import { render as weeklyDigest } from "./weekly-digest";
import { render as welcomeFirstRun } from "./welcome-first-run";

export type TemplateCategory =
  | "transactional"
  | "lifecycle"
  | "payment"
  | "campaign";

export interface TemplateDef {
  render: (props: any) => { subject: string; html: string; text: string };
  category: TemplateCategory;
}

const asTemplateDef = (
  render: (props: any) => { subject: string; html: string; text: string },
  category: TemplateCategory,
): TemplateDef => ({ render, category });

export const TEMPLATES: Record<string, TemplateDef> = {
  "verify-address": asTemplateDef(verifyAddress, "transactional"),
  "password-reset": asTemplateDef(passwordReset, "transactional"),
  "sign-in-code": asTemplateDef(signInCode, "transactional"),
  "welcome-first-run": asTemplateDef(welcomeFirstRun, "lifecycle"),
  "payment-received": asTemplateDef(paymentReceived, "payment"),
  "payment-failed": asTemplateDef(paymentFailed, "payment"),
  "exam-countdown": asTemplateDef(examCountdown, "campaign"),
  "weekly-digest": asTemplateDef(weeklyDigest, "campaign"),
  "referral-reward": asTemplateDef(referralReward, "campaign"),
  "come-back": asTemplateDef(comeBack, "campaign"),
  "subscription-ending": asTemplateDef(subscriptionEnding, "campaign"),
  "admin-invite": asTemplateDef(adminInvite, "lifecycle"),
  "partner-invite": asTemplateDef(partnerInvite, "lifecycle"),
  "admin-role-update": asTemplateDef(adminRoleUpdate, "lifecycle"),
  "admin-payment-alert": asTemplateDef(adminPaymentAlert, "transactional"),
};

export function isTemplate(name: string): name is keyof typeof TEMPLATES {
  return name in TEMPLATES;
}

export function templateCategory(name: string): TemplateCategory | null {
  const def = TEMPLATES[name];
  return def ? def.category : null;
}
