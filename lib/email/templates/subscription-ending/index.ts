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
  plan: string;
  date: string;
  subscriptionUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, plan, date, subscriptionUrl } = props;
  const intro = text(
    `Hi ${firstName}, your ${plan} plan ends on ${date}. Nothing is charged unless you renew.`,
  );
  const openLink = text(
    `Or open TiCLearn: ${link(subscriptionUrl, subscriptionUrl)}`,
  );
  const inner =
    section(h1(`Your ${plan} plan ends on ${date}`)) +
    section(intro) +
    divider() +
    button(subscriptionUrl, "Renew or change plan") +
    section(openLink);
  const children = header() + card(inner) + footer(subscriptionUrl);
  const html = layout({
    preheader: "Nothing is charged unless you renew.",
    appUrl: subscriptionUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your ${plan} plan ends on ${date}. Nothing is charged unless you renew. Open TiCLearn: ${subscriptionUrl}`;
  return {
    subject: subject("subscription-ending", { plan, date }),
    html,
    text: textBody,
  };
}
