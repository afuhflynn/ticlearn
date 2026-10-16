import { NextResponse } from "next/server";
import { isTemplate, TEMPLATES } from "@/lib/email/templates";

const SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  "verify-address": {
    firstName: "Student",
    code: "123456",
    verifyUrl: "https://ticlearn.ticsummit.org/verify?token=abc",
    expiresMinutes: 10,
  },
  "sign-in-code": { firstName: "Student", code: "123456" },
  "password-reset": {
    firstName: "Student",
    resetUrl: "https://ticlearn.ticsummit.org/reset?token=abc",
    expiresMinutes: 30,
  },
  "welcome-first-run": { firstName: "Student" },
  "payment-received": {
    firstName: "Student",
    planLabel: "Standard Plan",
    amountFcfa: 5000,
    reference: "TXN123",
    paidAt: new Date().toISOString(),
    practiceUrl: "https://ticlearn.ticsummit.org/practice",
  },
  "payment-failed": {
    firstName: "Student",
    planLabel: "Standard Plan",
    subscriptionUrl: "https://ticlearn.ticsummit.org/subscription",
  },
  "weekly-digest": {
    firstName: "Student",
    streak: 5,
    quizzes: 12,
    readinessPct: 72,
    weakestTopic: "Algebra",
    deltaPct: 4,
    reportUrl: "https://ticlearn.ticsummit.org/quizzes",
    unsubscribeUrl: "https://ticlearn.ticsummit.org/settings",
    weekOf: new Date().toISOString().slice(0, 10),
  },
  "exam-countdown": {
    firstName: "Student",
    daysUntilExam: 14,
    weakestTopic: "Algebra",
    practiceUrl: "https://ticlearn.ticsummit.org/practice",
  },
  "referral-reward": {
    firstName: "Student",
    rewardLabel: "1 month free",
    deepLink: "https://ticlearn.ticsummit.org/referral",
  },
  "subscription-ending": {
    firstName: "Student",
    planLabel: "Standard Plan",
    endsAt: new Date().toISOString(),
    renewUrl: "https://ticlearn.ticsummit.org/subscription",
  },
  "come-back": {
    firstName: "Student",
    practiceUrl: "https://ticlearn.ticsummit.org/practice",
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ template: string }> },
) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  const { template } = await params;
  if (!isTemplate(template)) {
    return new NextResponse("Unknown template", { status: 404 });
  }
  const props = SAMPLE_PROPS[template] ?? {};
  const { html } = TEMPLATES[template].render(props);
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
