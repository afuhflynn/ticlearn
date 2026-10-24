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
  streak: number;
  quizzes: number;
  reportUrl: string;
  unsubscribeUrl: string;
  weekOf: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, streak, quizzes, reportUrl, unsubscribeUrl, weekOf } =
    props;
  const intro = text(`Here is your week (${weekOf}).`);
  const optIn = text(
    `You received this because you opted in to weekly progress emails.<br><a href="${unsubscribeUrl}" style="color:#6D28D9;text-decoration:none;">Change preferences or unsubscribe</a>`,
  );
  const inner =
    section(h1(`Your week, ${firstName}`)) +
    section(intro) +
    statRow([
      { value: streak, label: "Day streak" },
      { value: quizzes, label: "Quizzes" },
    ]) +
    divider() +
    button(reportUrl, "See this week's report") +
    section(optIn);
  const children = header() + card(inner) + footer(reportUrl);
  const html = layout({
    preheader: `${streak} day streak · ${quizzes} quizzes`,
    appUrl: reportUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your week (${weekOf}): streak ${streak} days. Quizzes: ${quizzes}. Open your report: ${reportUrl}`;
  return {
    subject: subject("weekly-digest", {
      firstName,
      subject: "your week",
      deltaPct: 0,
    }),
    html,
    text: textBody,
  };
}
