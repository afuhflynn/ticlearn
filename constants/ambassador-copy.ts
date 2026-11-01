export const AMBASSADOR_COPY = {
  headline: "Invite friends, earn a Semester Pass",
  subhead:
    "Share your link on WhatsApp. When 3 friends verify email and pay for a pass or credits, you receive a Semester Pass automatically.",
  cta: "Share on WhatsApp",
  finePrint:
    "Campus ambassadors earn a Semester Pass for referrals. No cash is paid.",
  codeLabel: "Your code",
  linkLabel: "Your invite link",
  remaining: (n: number) =>
    n <= 0
      ? "You have earned your Semester Pass."
      : `${n} more friend${n === 1 ? "" : "s"} to your Semester Pass.`,
} as const;

export function ambassadorWhatsAppText(link: string): string {
  return `Join me on TiCLearn for notes, quizzes and Tip. Use my link ${link} so we both learn faster. Campus ambassadors earn a Semester Pass for referrals.`;
}

export function ambassadorWhatsAppUrl(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(ambassadorWhatsAppText(link))}`;
}

const BANNED = [
  "income",
  "earn money",
  "payout",
  "commission",
  "salary",
  "rich",
];

export function ambassadorCopyIsHonest(text: string): boolean {
  const lower = text.toLowerCase();
  return !BANNED.some((w) => lower.includes(w));
}
