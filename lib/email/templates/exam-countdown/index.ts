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
  weakestTopic: string;
  deepLink: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, days, weakestTopic, deepLink } = props;
  const intro = text(
    `Hi ${firstName}, your exam is getting close. Your weakest topic is ${weakestTopic}. A focused 10-minute session is the fastest way to move it.`,
  );
  const openLink = text(`Or open TiCLearn: ${link(deepLink, deepLink)}`);
  const inner =
    section(h1(`${days} days until your exam`)) +
    section(intro) +
    divider() +
    button(deepLink, "Practise my weak topic") +
    section(openLink);
  const children = header() + card(inner) + footer(deepLink);
  const html = layout({
    preheader: `Your weakest topic is ${weakestTopic}. Here is the fastest way to move it.`,
    appUrl: deepLink,
    children,
  });
  const textBody = `Hi ${firstName}, your exam is in ${days} days. Your weakest topic is ${weakestTopic}. Practise it now: ${deepLink}`;
  return { subject: subject("exam-countdown", { days }), html, text: textBody };
}
