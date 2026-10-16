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
  inviterName: string;
  email: string;
  inviteLink: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { inviterName, email, inviteLink } = props;
  const intro = text(
    `Hi there, ${inviterName} has invited you to become an Administrator on TiCLearn.`,
  );
  const about = text(
    "As an admin, you will manage users, content, and platform settings so students get the best learning experience.",
  );
  const invitee = text(`This invitation is for <strong>${email}</strong>.`);
  const expiry = text(
    "If you do not have an account yet, you will be asked to create one first. This invitation expires in 7 days.",
  );
  const inner =
    section(h1("You've been invited to become an Admin")) +
    section(intro) +
    section(about) +
    `<tr><td style="padding:24px;background:#F3F4F6;border-radius:12px;"><p style="margin:0;font-size:14px;color:#4B5563;">${invitee}</p></td></tr>` +
    divider() +
    button(inviteLink, "Accept invitation") +
    section(expiry);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org/admin");
  const html = layout({
    preheader: "You have been invited to become an administrator on TiCLearn.",
    appUrl: "https://ticlearn.ticsummit.org/admin",
    children,
  });
  const textBody = `${inviterName} has invited you to become an Administrator on TiCLearn. This invitation is for ${email}. Accept: ${inviteLink}. Expires in 7 days.`;
  return { subject: subject("admin-invite", {}), html, text: textBody };
}
