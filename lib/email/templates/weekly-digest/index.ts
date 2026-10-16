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
  statRow,
  text,
} from "@/lib/email/layout";

interface Props {
  firstName: string;
  streak: number;
  quizzes: number;
  readinessPct: number;
  weakestTopic: string;
  deltaPct: number;
  reportUrl: string;
  unsubscribeUrl: string;
  weekOf: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    firstName,
    streak,
    quizzes,
    readinessPct,
    weakestTopic,
    deltaPct,
    reportUrl,
    unsubscribeUrl,
    weekOf,
  } = props;
  const intro = text(
    `You moved ${weakestTopic} by +${deltaPct}% this week (${weekOf}). Here is what moved:`,
  );
  const keepWorking = text(
    `Keep working on ${weakestTopic} to boost your score further.`,
  );
  const optIn = text(
    `You received this because you opted in to weekly progress emails.<br><a href="${unsubscribeUrl}" style="color:#6D28D9;text-decoration:none;">Change preferences or unsubscribe</a>`,
  );
  const inner =
    section(h1(`Your week, ${firstName}`)) +
    section(intro) +
    statRow([
      { value: streak, label: "Day streak" },
      { value: quizzes, label: "Quizzes" },
      { value: readinessPct + "%", label: "Readiness" },
    ]) +
    divider() +
    section(keepWorking) +
    button(reportUrl, "See this week's report") +
    section(optIn);
  const children = header() + card(inner) + footer(reportUrl);
  const html = layout({
    preheader: `${streak} day streak · ${quizzes} quizzes · readiness ${readinessPct}%`,
    appUrl: reportUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your week (${weekOf}): you moved ${weakestTopic} by +${deltaPct}%. Streak: ${streak} days. Quizzes: ${quizzes}. Readiness: ${readinessPct}%. Open your report: ${reportUrl}`;
  return {
    subject: subject("weekly-digest", {
      firstName,
      subject: weakestTopic,
      deltaPct,
    }),
    html,
    text: textBody,
  };
}
