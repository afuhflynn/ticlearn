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
  onboardingUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, onboardingUrl } = props;
  const intro = text(
    `Hi ${firstName}, your TiCLearn account is active. Pick your programme and we will build your first practice set today.`,
  );
  const openLink = text(
    `Or open TiCLearn: ${link(onboardingUrl, onboardingUrl)}`,
  );
  const inner =
    section(h1("Let's start with one quiz")) +
    section(intro) +
    divider() +
    button(onboardingUrl, "Pick my programme") +
    section(openLink);
  const children = header() + card(inner) + footer(onboardingUrl);
  const html = layout({
    preheader: "Pick a programme. We will build your first practice set.",
    appUrl: onboardingUrl,
    children,
  });
  const textBody = `Hi ${firstName}, your TiCLearn account is active. Pick your programme so we can build your first practice set. Open TiCLearn: ${onboardingUrl}`;
  return {
    subject: subject("welcome-first-run", { firstName }),
    html,
    text: textBody,
  };
}
