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
  userName: string;
  userEmail: string;
  planLabel: string;
  amountFcfa: number;
  reference: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, userEmail, planLabel, amountFcfa, reference } = props;
  const customer = text(`Customer: ${userName} (${userEmail})`);
  const inner =
    section(h1("New payment received")) +
    statRow([
      { value: planLabel, label: "Plan" },
      { value: amountFcfa.toLocaleString("en-US") + " FCFA", label: "Amount" },
      { value: reference, label: "Reference" },
    ]) +
    divider() +
    section(customer);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org/admin");
  const html = layout({
    preheader: `New payment received: ${planLabel} — ${amountFcfa} FCFA`,
    appUrl: "https://ticlearn.ticsummit.org/admin",
    children,
  });
  const textBody = `New payment: ${userName} (${userEmail}), ${planLabel}, ${amountFcfa.toLocaleString("en-US")} FCFA, ref ${reference}`;
  return {
    subject: subject("admin-payment-alert", { planLabel, userName }),
    html,
    text: textBody,
  };
}
