const SUBJECTS: Record<string, string> = {
  "verify-address": "Your TiCLearn code: {{code}}",
  "welcome-first-run": "Let's start with one quiz, {{firstName}}",
  "password-reset": "Reset code: {{code}}",
  "sign-in-code": "Your TiCLearn sign-in code",
  "payment-received": "Payment received — {{planLabel}}, {{amountFcfa}} FCFA",
  "payment-failed": "Your {{planLabel}} payment did not go through",
  "exam-countdown": "{{days}} days until your exam",
  "weekly-digest": "{{firstName}}, you moved {{subject}} by {{deltaPct}}%",
  "referral-reward": "Your friend upgraded — {{days}} days of {{plan}} added",
  "come-back": "Your {{exam}} exam is getting close",
  "subscription-ending": "Your {{plan}} plan ends on {{date}}",
  "admin-invite": "Invitation to become an Admin on TiCLearn 🛡️",
  "admin-role-update":
    "Your TiCLearn account role has been updated to {{role}} 🛡️",
  "admin-payment-alert": "💰 New Sale: {{planLabel}} — {{userName}}",
};

export function subject(
  name: string,
  values: Record<string, string | number>,
): string {
  let s = SUBJECTS[name] ?? "TiCLearn Update";
  for (const [key, value] of Object.entries(values)) {
    s = s.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return s;
}

export { SUBJECTS };
