import { LEGAL_LAST_UPDATED } from "@/constants";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Privacy Policy · TiCLearn",
  description:
    "How TiCLearn handles your account, your notes and your chats, and who processes them.",
  path: "/privacy",
});

/**
 * The privacy page, from spec 0016 AC-8. It says only what the system really
 * does: what is collected, that note text and chat text reach AI providers,
 * the honest third party list, and how deletion happens. No encryption at
 * rest claim, no promise to notify about changes, and no contact channel
 * except the WhatsApp group.
 */
export default function PrivacyPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>

        <div className="prose prose-stone dark:prose-invert space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              This policy explains what TiCLearn collects, what happens to it,
              and who else touches it. It is deliberately plain. If a sentence
              here stops matching what the product does, treat the date at the
              bottom as the mark of when it was true.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. What We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Account:</strong> your name, email and profile picture
                when you sign up
              </li>
              <li>
                <strong>Uploaded notes:</strong> the files you upload and the
                text and summaries extracted from them
              </li>
              <li>
                <strong>Chats with Tip:</strong> the questions you ask and the
                answers you get
              </li>
              <li>
                <strong>Usage:</strong> what you take, what you open, and the
                counts that apply your free limits
              </li>
              <li>
                <strong>Device:</strong> browser, device type and IP address
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              3. AI Processing of Your Notes and Chats
            </h2>
            <p className="text-muted-foreground">
              When you ask Tip a question or generate a quiz, the text of the
              note in question (and your message) is sent to an AI service
              provider so it can produce the study answer. Those providers
              process it for that request and under their own terms. We cannot
              train on what is not yours, but assume anything you upload or type
              leaves our own systems in that way. Do not upload or paste
              material you are not comfortable sending through an AI provider.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              4. Who Else Processes Your Data
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Content storage:</strong> uploaded files are stored
                through UploadThing
              </li>
              <li>
                <strong>Database:</strong> your account, notes, chats and usage
                live in a managed Postgres database (Neon)
              </li>
              <li>
                <strong>Payment processor:</strong> paid plans are billed
                through Fapshi, which handles the MTN MoMo and Orange Money
                charge and tells us the result
              </li>
              <li>
                <strong>Email sender:</strong> verification codes and account
                emails are sent through our email service
              </li>
              <li>
                <strong>Error reporting:</strong> technical errors are reported
                to Sentry so we can fix them
              </li>
              <li>
                <strong>AI providers:</strong> the models behind Tip, reached
                through our AI gateway (currently Google Gemini models)
              </li>
            </ul>
            <p className="text-muted-foreground">
              We do not sell your personal information. These providers may use
              your data to deliver their own services under their own policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. How We Use It</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To run the study features: notes, quizzes and Tip</li>
              <li>To apply your plan limits and process payments</li>
              <li>To send account emails you need, like verification</li>
              <li>To fix problems and keep the service safe</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies to keep you signed in. You can control cookies in
              your browser settings; essential ones are required for the
              platform to work.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              7. Retention and Deletion
            </h2>
            <p className="text-muted-foreground">
              We keep your data while your account is active. You can request
              deletion of your account and everything in it through the WhatsApp
              group, and we will remove your data except where the law requires
              us to keep it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Your Choices</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Ask what we hold about you</li>
              <li>Ask for a copy of your data</li>
              <li>Ask us to delete your account</li>
            </ul>
            <p className="text-muted-foreground">
              Every request starts through the WhatsApp group, the one channel
              we answer from.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Children</h2>
            <p className="text-muted-foreground">
              TiCLearn is not intended for children under 13. We do not
              knowingly collect personal information from them.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Changes</h2>
            <p className="text-muted-foreground">
              This policy can change as the product changes. The "last updated"
              date below is the current one; check back before trusting an old
              reading of it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Contact Us</h2>
            <p className="text-muted-foreground">
              Privacy questions? Reach the team on the{" "}
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                TiCLearn WhatsApp group
              </a>
              .
            </p>
          </section>

          <p className="text-sm text-muted-foreground pt-8">
            {LEGAL_LAST_UPDATED}
          </p>
        </div>
      </div>
    </div>
  );
}
