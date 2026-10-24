import Image from "next/image";

const CARDS = [
  {
    number: "1",
    title: "Ask Tip about what you're studying",
    body: "Get simple, step by step explanations and follow-up answers from Tip.",
    image: "/marketing/tip-answer-1280.webp",
    alt: "Tip quoting a paragraph from a second year Operating Systems note and explaining it, with the note title and page cited.",
  },
  {
    number: "2",
    title: "Turn a topic into focused practice",
    body: "Generate quizzes and practice questions from your material, with instant feedback.",
    image: "/marketing/quiz-question-1280.webp",
    alt: "A quiz question generated from the Operating Systems note, with the right answer marked green and a wrong one marked red.",
  },
  {
    number: "3",
    title: "See what to revisit next",
    body: "Review the questions you missed, then ask Tip to explain the ones that still feel unclear.",
    image: "/marketing/attempt-result-1280.webp",
    alt: "A finished quiz attempt in TiCLearn showing the question, the answer that was chosen and the correct answer.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 border-b border-border bg-muted/30 px-5 py-14 md:px-8 md:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="grid gap-6 md:grid-cols-2 md:items-end md:gap-12">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              How it works
            </p>
            <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-[2.6rem]">
              One place to move from confusion to{" "}
              <span className="font-serif text-primary italic">practice.</span>
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              TiCLearn helps you turn your course materials into clear
              explanations, focused practice and useful feedback. Everything is
              built around your real study content.
            </p>
            <p className="text-xs md:text-sm">
              AI outputs should be checked against your source materials where
              needed. They can be helpful, but are not infallible.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-3">
          {CARDS.map((card) => (
            <article
              key={card.number}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold">
                  {card.number}. {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.body}
                </p>
              </div>
              <div className="mt-auto overflow-hidden rounded-md border border-border bg-background">
                <Image
                  src={card.image}
                  alt={card.alt}
                  width={1280}
                  height={800}
                  sizes="(min-width: 768px) 340px, 100vw"
                  className="h-auto w-full"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
