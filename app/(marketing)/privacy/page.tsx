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
              At TiCLearn, we take your privacy seriously. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Account Information:</strong> Name, email, profile
                picture when you sign up
              </li>
              <li>
                <strong>Study Content:</strong> Notes, quizzes, and other
                materials you upload
              </li>
              <li>
                <strong>Usage Data:</strong> How you interact with the platform,
                quiz scores, progress
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, device type,
                IP address
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and improve our educational services</li>
              <li>To personalize your learning experience</li>
              <li>To communicate with you about your account</li>
              <li>To process subscription payments</li>
              <li>To send important updates and notifications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Data Protection</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, disclosure, or destruction. All data is encrypted in
              transit and at rest.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Service providers who help operate our platform</li>
              <li>Payment processors for subscription handling</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Email Verification</h2>
            <p className="text-muted-foreground">
              For manual sign-ups, we require email verification to ensure
              account security. You will receive a verification link to activate
              your account. We store your email securely and only use it for
              account-related communications.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use cookies to enhance your experience. You can control cookies
              through your browser settings. Essential cookies are required for
              the platform to function properly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data while your account is active. You can request
              account deletion at any time, and we will remove your data within
              30 days, except where required by law to retain certain
              information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Third-Party Services</h2>
            <p className="text-muted-foreground">
              Our platform uses third-party services including payment
              processors (Fapshi), file storage (UploadThing), and analytics.
              These services have their own privacy policies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Children's Privacy</h2>
            <p className="text-muted-foreground">
              TiCLearn is not intended for children under 13. We do not
              knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              12. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this policy periodically. We will notify you of
              significant changes via email or platform notification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">13. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, contact us at hello@ticlearn.com.
            </p>
          </section>

          <p className="text-sm text-muted-foreground pt-8">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
