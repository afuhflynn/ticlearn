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
  userName: string;
  userEmail: string;
  typeLabel: string;
  subjectLine: string;
  message: string;
  rating?: number | null;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, userEmail, typeLabel, subjectLine, message, rating } =
    props;
  const ratingHtml =
    rating !== undefined && rating !== null
      ? text(`Rating: ${rating > 0 ? "👍 Thumbs Up" : "👎 Thumbs Down"}`)
      : "";
  const from = text(`From: ${userName} (${userEmail})`);
  const type = text(`Type: ${typeLabel}`);
  const subj = text(`Subject: ${subjectLine}`);
  const body = text(message.slice(0, 500));
  const inner =
    section(h1("New feedback received")) +
    section(from) +
    section(type) +
    section(subj) +
    section(ratingHtml) +
    divider() +
    section(body);
  const children =
    header() +
    card(inner) +
    footer("https://ticlearn.ticsummit.org/admin/feedback");
  const html = layout({
    preheader: `New ${typeLabel.toLowerCase()} from ${userName}`,
    appUrl: "https://ticlearn.ticsummit.org/admin/feedback",
    children,
  });
  const textBody = `New feedback: ${typeLabel} — ${userName} (${userEmail}). Subject: ${subjectLine}. Message: ${message.slice(0, 500)}`;
  return {
    subject: subject("admin-feedback-alert", { typeLabel, userName }),
    html,
    text: textBody,
  };
}
