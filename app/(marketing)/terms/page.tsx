import { LEGAL_LAST_UPDATED } from "@/constants";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Terms of Service · TiCLearn",
  description:
    "The rules for using TiCLearn: accounts, uploads, chats and paying with MTN MoMo and Orange Money.",
  path: "/terms",
});

/**
 * The terms page, from spec 0016 AC-7. The money stance is deliberately
 * minimal: features bill in advance at the prices shown at checkout, there is
 * no billing period promise, no refund policy and no affiliate section. Every
 * contact line points at the WhatsApp group and no page names an amount.
 */
export default function TermsPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Terms of Service
        </h1>

        <div className="prose prose-stone dark:prose-invert space-y-6">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using TiCLearn, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do
              not use our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground">
              TiCLearn is a study platform for university students in Cameroon.
              You upload your own study material, turn it into quizzes, and
              learn with Tip, an AI tutor that teaches from what you uploaded.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                You must provide accurate and complete registration information
              </li>
              <li>
                You are responsible for keeping your account credentials safe
              </li>
              <li>You must be at least 13 years old to create an account</li>
              <li>
                We may suspend or close accounts that violate these terms or
                misuse the service
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Your Material</h2>
            <p className="text-muted-foreground">
              You keep ownership of the notes and files you upload. By uploading
              them, you allow TiCLearn to process them to produce the summaries,
              quizzes and tutoring answers you ask for. Only use material you
              are permitted to study from.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Obey all applicable laws and regulations</li>
              <li>Do not impersonate any person or entity</li>
              <li>Do not post harmful, abusive, or discriminatory content</li>
              <li>Do not attempt to gain unauthorized access to our systems</li>
              <li>
                Do not interfere with the proper functioning of the service
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              6. Payments and Paid Features
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                Paid features bill in advance, at the prices shown at checkout
              </li>
              <li>
                You pay with MTN MoMo or Orange Money, processed through our
                payment provider, Fapshi
              </li>
              <li>
                You can stop paying at any time. Paid features end when a paid
                period ends; free limits apply again
              </li>
              <li>
                We do not promise refunds under these terms. If you were charged
                twice or what you paid for does not work, reach the team on
                WhatsApp (section 8) and we will look into it
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              7. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground">
              TiCLearn is provided "as is" without warranties of any kind. We do
              not guarantee that the service will be error-free or
              uninterrupted. Study answers from Tip can be wrong, so always
              check important facts against your course material.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              8. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              TiCLearn shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about these terms? Reach the team on the{" "}
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                TiCLearn WhatsApp group
              </a>
              , the one channel we answer from.
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
