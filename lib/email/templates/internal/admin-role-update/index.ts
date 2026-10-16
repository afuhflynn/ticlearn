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
  name: string;
  newRole: string;
  dashboardUrl: string;
}

export function render(props: Props): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, newRole, dashboardUrl } = props;
  const isAdmin = newRole === "ADMIN";
  const body = isAdmin
    ? text(
        "You now have access to the administrative dashboard and can manage platform content and users.",
      )
    : text(
        "Your administrative privileges have been revoked. You still have full access to all student features.",
      );
  const ctaUrl = isAdmin ? dashboardUrl : dashboardUrl.replace("/admin", "");
  const ctaLabel = isAdmin ? "Go to admin dashboard" : "Go to dashboard";
  const intro = text(
    `Hi ${name}, your account role on TiCLearn has been updated to ${newRole} by an administrator.`,
  );
  const errorNote = text(
    "If you believe this change was made in error, contact our support team.",
  );
  const inner =
    section(h1("Role updated")) +
    section(intro) +
    section(body) +
    divider() +
    button(ctaUrl, ctaLabel) +
    section(errorNote);
  const children =
    header() + card(inner) + footer("https://ticlearn.ticsummit.org/admin");
  const html = layout({
    preheader: `Your account role has been updated to ${newRole}.`,
    appUrl: "https://ticlearn.ticsummit.org/admin",
    children,
  });
  const textBody = `Hi ${name}, your TiCLearn account role has been updated to ${newRole}. Open TiCLearn: ${dashboardUrl}`;
  return {
    subject: subject("admin-role-update", { role: newRole }),
    html,
    text: textBody,
  };
}
