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
  verifyUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, code, expiresMinutes, verifyUrl } = props;
  const intro = text(
    `Hi ${firstName}, welcome to TiCLearn. Use the verification code below to finish setting up your account.`,
  );
  const expiry = text(
    `This code expires in ${expiresMinutes} minutes. If you did not create an account, you can ignore this email.`,
  );
  const openLink = text(`Or open this link: ${link(verifyUrl, verifyUrl)}`);
  const inner =
    section(h1("Verify your email")) +
    section(intro) +
    codeBlock(code) +
    section(expiry) +
    divider() +
    button(verifyUrl, "Enter the code") +
    section(openLink);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org");
  const html = layout({
    preheader: `Your sign-in code is ready. It expires in ${expiresMinutes} minutes.`,
    appUrl: "https://ticlearn.ticsummit.org",
    children,
  });
  const textBody = `Hi ${firstName}, your TiCLearn verification code is ${code}. It expires in ${expiresMinutes} minutes. Open this link to verify: ${verifyUrl}. If you did not create an account, ignore this email.`;
  return { subject: subject("verify-address", { code }), html, text: textBody };
}
