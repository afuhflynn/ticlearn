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
  appUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, code, expiresMinutes, appUrl } = props;
  const intro = text(
    `Hi ${firstName}, use the code below to sign in to TiCLearn.`,
  );
  const expiry = text(
    `This code expires in ${expiresMinutes} minutes. If this was not you, ignore this email.`,
  );
  const openLink = text(`Or open TiCLearn: ${link(appUrl, appUrl)}`);
  const inner =
    section(h1("Your sign-in code")) +
    section(intro) +
    codeBlock(code) +
    section(expiry) +
    divider() +
    button(appUrl, "Open TiCLearn") +
    section(openLink);
  const children = header() + card(inner) + footer(appUrl);
  const html = layout({
    preheader: `Your sign-in code is ready. It expires in ${expiresMinutes} minutes.`,
    appUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your TiCLearn sign-in code is ${code}. It expires in ${expiresMinutes} minutes. Open TiCLearn: ${appUrl}. If this was not you, ignore this email.`;
  return { subject: subject("sign-in-code", {}), html, text: textBody };
}
