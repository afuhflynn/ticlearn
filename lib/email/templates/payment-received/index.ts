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
  statRow,
  text,
} from "@/lib/email/layout";

interface Props {
  firstName: string;
  planLabel: string;
  amountFcfa: number;
  reference: string;
  paidAt: string;
  practiceUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, planLabel, amountFcfa, reference, paidAt, practiceUrl } =
    props;
  const intro = text(
    `Hi ${firstName}, your payment has been confirmed and your ${planLabel} plan is active now.`,
  );
  const receipt = text(
    `Paid on ${paidAt}. Transaction reference: ${reference}.`,
  );
  const inner =
    section(h1("Payment received")) +
    section(intro) +
    statRow([
      {
        value:
          amountFcfa.toLocaleString("en-US", { minimumFractionDigits: 0 }) +
          " FCFA",
        label: "Amount paid",
      },
      { value: planLabel, label: "Plan" },
      { value: reference, label: "Reference" },
    ]) +
    divider() +
    button(practiceUrl, "Start practising") +
    section(receipt);
  const children = header() + card(inner) + footer(practiceUrl);
  const html = layout({
    preheader: `Reference ${reference}. Your ${planLabel} plan is active now.`,
    appUrl: practiceUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your payment of ${amountFcfa.toLocaleString("en-US")} FCFA for the ${planLabel} plan has been received. Reference: ${reference}. Paid on ${paidAt}. Open TiCLearn: ${practiceUrl}`;
  return {
    subject: subject("payment-received", { planLabel, amountFcfa }),
    html,
    text: textBody,
  };
}
