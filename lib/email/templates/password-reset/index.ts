import { subject } from "@/lib/email/content/subjects";
import {
  button,
  card,
  codeBlock,
  divider,
  footer,
  h1,
  header,
  layout,
  link,
  section,
  text,
} from "@/lib/email/layout";

interface Props {
  firstName: string;
  code: string;
  expiresMinutes: number;
  resetUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, code, expiresMinutes, resetUrl } = props;
  const intro = text(
    `Hi ${firstName}, use the code below to reset your TiCLearn password.`,
  );
  const expiry = text(
    `This code expires in ${expiresMinutes} minutes. If you did not request a password reset, you can ignore this email.`,
  );
  const openLink = text(`Or open this link: ${link(resetUrl, resetUrl)}`);
  const inner =
    section(h1("Reset your password")) +
    section(intro) +
    codeBlock(code) +
    section(expiry) +
    divider() +
    button(resetUrl, "Reset your password") +
    section(openLink);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org");
  const html = layout({
    preheader: `Your password reset code is ready. It expires in ${expiresMinutes} minutes.`,
    appUrl: "https://ticlearn.ticsummit.org",
    children,
  });
  const textBody = `Hi ${firstName}, your TiCLearn password reset code is ${code}. It expires in ${expiresMinutes} minutes. Open this link to reset: ${resetUrl}. If you did not request this, ignore this email.`;
  return { subject: subject("password-reset", { code }), html, text: textBody };
}
