"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * The one client island on the public FAQ surfaces. `forceMount` keeps every
 * answer in the first HTML rather than only after a tap, so the questions and
 * answers are readable on a bad connection and indexable.
 *
 * Because the content stays mounted, the closed item is hidden here with
 * state based styling instead of an unmount. That is what fixes the answers
 * being permanently visible (spec 0016 AC-5): the tracked `openQuestion` value
 * decides whether the content shows, and only the tapped answer does.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  // The empty string is the canonical "nothing open" value for a collapsible
  // single accordion, so the state stays controlled across the collapse.
  const [openQuestion, setOpenQuestion] = useState<string>("");

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      value={openQuestion}
      onValueChange={setOpenQuestion}
    >
      {items.map((faq) => {
        const showsAnswer = openQuestion === faq.question;
        return (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger className="text-left text-base font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent
              forceMount
              className={
                showsAnswer
                  ? "text-muted-foreground"
                  : "hidden text-muted-foreground"
              }
            >
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
