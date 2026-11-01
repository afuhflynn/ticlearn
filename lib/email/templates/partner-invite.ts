import { subject } from "@/lib/email/content/subjects";
import {
  button,
  card,
  divider,
  footer,
  h1,
  header,
  layout,
  section,
  text,
} from "@/lib/email/layout";

interface Props {
  email: string;
  inviteLink: string;
  expiresDate: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { email, inviteLink, expiresDate } = props;
  const intro = text(
    "You have been chosen as a TiCLearn partner. Claim your link, share it with students, and earn a commission on each settled pass or credit order they pay for.",
  );
  const invitee = text(`This invitation is for <strong>${email}</strong>.`);
  const expiry = text(
    `This link expires on ${expiresDate}. If it expires, ask the team for a fresh invite.`,
  );
  const inner =
    section(h1("You are invited to partner with TiCLearn")) +
    section(intro) +
    section(invitee) +
    divider() +
    button(inviteLink, "Claim your partner link") +
    section(expiry);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org/");
  const html = layout({
    preheader: "Claim your TiCLearn partner link.",
    appUrl: "https://ticlearn.ticsummit.org/",
    children,
  });
  const textBody = `You are invited to partner with TiCLearn as ${email}. Claim: ${inviteLink}. Expires ${expiresDate}.`;
  return { subject: subject("partner-invite", {}), html, text: textBody };
}
