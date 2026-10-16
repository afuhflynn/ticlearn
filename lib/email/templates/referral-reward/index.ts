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
  days: number;
  plan: string;
  inviteUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, days, plan, inviteUrl } = props;
  const intro = text(
    `Hi ${firstName}, your friend upgraded to a ${plan} plan and ${days} days have been added to your account as a thank you.`,
  );
  const openLink = text(`Or open TiCLearn: ${link(inviteUrl, inviteUrl)}`);
  const inner =
    section(h1("Your friend upgraded")) +
    section(intro) +
    divider() +
    button(inviteUrl, "Invite another friend") +
    section(openLink);
  const children = header() + card(inner) + footer(inviteUrl);
  const html = layout({
    preheader: "Your referral credit is now on your account.",
    appUrl: inviteUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your friend upgraded to a ${plan} plan and ${days} days were added to your account. Invite another friend: ${inviteUrl}`;
  return {
    subject: subject("referral-reward", { days, plan }),
    html,
    text: textBody,
  };
}
