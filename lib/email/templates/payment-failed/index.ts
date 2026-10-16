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
  planLabel: string;
  subscriptionUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, planLabel, subscriptionUrl } = props;
  const intro = text(
    `Hi ${firstName}, your payment attempt for the ${planLabel} plan did not complete. No money was taken.`,
  );
  const safe = text(
    "Your account is safe. You can retry the payment with MTN or Orange Mobile Money.",
  );
  const openLink = text(
    `Or open TiCLearn: ${link(subscriptionUrl, subscriptionUrl)}`,
  );
  const inner =
    section(h1("Your payment did not go through")) +
    section(intro) +
    section(safe) +
    divider() +
    button(subscriptionUrl, "Retry payment", false) +
    section(openLink);
  const children = header() + card(inner) + footer(subscriptionUrl);
  const html = layout({
    preheader: "No money was taken. Tap to retry with MTN or Orange MoMo.",
    appUrl: subscriptionUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your payment for the ${planLabel} plan did not go through. No money was taken. Retry payment with MTN or Orange MoMo: ${subscriptionUrl}`;
  return {
    subject: subject("payment-failed", { planLabel }),
    html,
    text: textBody,
  };
}
