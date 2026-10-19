import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/constants";

export const metadata: Metadata = {
  title: "FAQ · Cost, Data Use and Offline Access",
  description:
    "Answers Cameroonian university students ask most: what TiCLearn costs, how much data it uses, and whether it works on a weak connection.",
};

export default function FAQPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-12">
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about TiCLearn.
          </p>
        </section>

        <FaqAccordion items={FAQ_ITEMS} />

        <section className="rounded-xl border p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold">Still have questions?</h2>
          <p className="mb-4 text-muted-foreground">
            Can&apos;t find the answer you&apos;re looking for? Contact our
            support team.
          </p>
          <a
            href="/contact"
            className="text-primary font-medium hover:underline"
          >
            Contact Support <ArrowRight className="inline-block size-sm ml-1" />
          </a>
        </section>
      </div>
    </div>
  );
}
