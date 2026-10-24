import {
  FaqAccordion,
  type FaqItem,
} from "@/components/marketing/faq-accordion";

const LANDING_FAQ: FaqItem[] = [
  {
    question: "Can I use my own notes?",
    answer:
      "Yes. Upload the supported digital materials you have, and Tip works from what you upload.",
  },
  {
    question: "Is TiCLearn for university and HND students?",
    answer:
      "Yes, the platform is designed for tertiary students in Cameroon, across universities and HND programmes.",
  },
  {
    question: "Can AI get something wrong?",
    answer:
      "AI can make mistakes, so verify important details against your course materials.",
  },
  {
    question: "Do I need a laptop?",
    answer:
      "The experience should be mobile-friendly; access still depends on your device and connection.",
  },
];

export function LandingFaq() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-b border-border px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1120px] space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Questions
          </p>
          <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight md:text-[2.6rem]">
            Frequently asked{" "}
            <span className="font-serif text-primary italic">questions</span>
          </h2>
        </div>

        <div className="grid gap-x-10 md:grid-cols-2">
          <FaqAccordion items={LANDING_FAQ.slice(0, 2)} />
          <FaqAccordion items={LANDING_FAQ.slice(2)} />
        </div>
      </div>
    </section>
  );
}
