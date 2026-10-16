import { subject } from "@/lib/email/content/subjects";
import {
  button,
  card,
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
  exam: string;
  resumeUrl: string;
  unsubscribeUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, exam, resumeUrl, unsubscribeUrl } = props;
  const intro = text(
    `Hi ${firstName}, it has been a while. Two minutes of practice is enough to restart your study habit.`,
  );
  const optIn = text(
    `You received this because you opted in to progress emails.<br><a href="${unsubscribeUrl}" style="color:#6D28D9;text-decoration:none;">Change preferences or unsubscribe</a>`,
  );
  const inner =
    section(h1(`Your ${exam} exam is getting close`)) +
    section(intro) +
    divider() +
    button(resumeUrl, "Resume where you left off") +
    section(optIn);
  const children = header() + card(inner) + footer(resumeUrl);
  const html = layout({
    preheader: "Two minutes of practice is enough to restart.",
    appUrl: resumeUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your ${exam} exam is getting close. Two minutes of practice is enough to restart. Resume: ${resumeUrl}`;
  return { subject: subject("come-back", { exam }), html, text: textBody };
}
