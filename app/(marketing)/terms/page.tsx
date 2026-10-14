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
              TiCLearn is an AI-powered educational platform that provides study
              tools, quizzes, and study resources, and Tip tutoring for
              university students in Cameroon.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                You must provide accurate and complete registration information
              </li>
              <li>
                You are responsible for maintaining the security of your account
              </li>
              <li>You must be at least 13 years old to create an account</li>
              <li>
                You agree to notify us immediately of any unauthorized access
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these terms
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. User Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you upload to TiCLearn. By
              uploading content, you grant us permission to use it for providing
              and improving our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Prohibited Conduct</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violating any applicable laws or regulations</li>
              <li>Impersonating any person or entity</li>
              <li>Posting harmful, abusive, or discriminatory content</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Interfering with the proper functioning of the platform</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              6. Subscription and Payments
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                Subscription fees are billed in advance on a monthly basis
              </li>
              <li>You can cancel your subscription at any time</li>
              <li>
                Refunds are available within 7 days of payment if unsatisfactory
              </li>
              <li>Prices are subject to change with 30 days notice</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Affiliate Program</h2>
            <p className="text-muted-foreground">
              Our affiliate program allows users to earn commissions by
              referring new subscribers. Affiliates must comply with our
              marketing guidelines and cannot make false claims about TiCLearn.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground">
              TiCLearn is provided "as is" without warranties of any kind. We do
              not guarantee that the service will be error-free or
              uninterrupted.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">
              9. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              TiCLearn shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the platform.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please contact us at
              hello@ticlearn.com.
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
