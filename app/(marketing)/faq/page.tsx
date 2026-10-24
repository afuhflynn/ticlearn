import type { Metadata } from "next";
import { FaWhatsapp } from "react-icons/fa6";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/constants";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

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
            Can&apos;t find the answer you&apos;re looking for? Reach the team
            on WhatsApp; a person reads it, not a bot.
          </p>
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-primary font-medium underline-offset-4 hover:underline"
          >
            <FaWhatsapp className="size-4" />
            {WHATSAPP_GROUP_LABEL}
          </a>
        </section>
      </div>
    </div>
  );
}
