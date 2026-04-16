"use client";

import { FAQ_ITEMS } from "@/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

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

        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((faq, index) => (
            <AccordionItem key={`faq-${index}`} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

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
