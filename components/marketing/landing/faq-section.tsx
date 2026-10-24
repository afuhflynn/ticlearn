import { FaWhatsapp } from "react-icons/fa6";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/constants";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The curated landing questions, a named subset of `FAQ_ITEMS` picked by
 * question string (spec 0016 AC-4). The full set of 18 stays on `/faq`; the
 * landing answers only the questions students ask while deciding to sign up.
 */
const LANDING_FAQ_QUESTIONS = [
  "What is TiCLearn?",
  "Is TiCLearn free to use?",
  "What payment methods do you accept?",
  "How much data does TiCLearn use?",
  "Can I use TiCLearn offline?",
  "Is my data secure?",
];

const LANDING_FAQ = LANDING_FAQ_QUESTIONS.flatMap((question) => {
  const found = FAQ_ITEMS.find((item) => item.question === question);
  return found ? [found] : [];
});

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-b border-border px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Questions
          </p>
          <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight md:text-[2.6rem]">
            Frequently asked{" "}
            <span className="font-serif text-primary italic">questions</span>
          </h2>
        </div>

        <FaqAccordion items={LANDING_FAQ} />

        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          More questions?{" "}
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
          >
            <FaWhatsapp className="size-4" />
            {WHATSAPP_GROUP_LABEL}
          </a>
        </p>
      </div>
    </section>
  );
}
