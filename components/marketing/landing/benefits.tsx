import { Brain, ClipboardCheck, FileText } from "lucide-react";

const BENEFITS = [
  {
    title: "Your course materials first",
    body: "Use your own notes, slides and handouts to generate practice and explanations.",
    Icon: FileText,
  },
  {
    title: "Understand, don't just memorize",
    body: "Get clear explanations and learn at your own pace.",
    Icon: Brain,
  },
  {
    title: "Feedback you can act on",
    body: "See what you got right, what to review, and what to study next.",
    Icon: ClipboardCheck,
  },
] as const;

export function LandingBenefits() {
  return (
    <section className="border-b border-border px-5 py-10 md:px-8 md:py-14">
      <ul className="mx-auto grid w-full max-w-[1120px] gap-8 md:grid-cols-3 md:gap-6">
        {BENEFITS.map((benefit) => (
          <li
            key={benefit.title}
            className="flex flex-col items-center gap-3 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <benefit.Icon className="h-5 w-5 text-primary" />
            </span>
            <h2 className="text-base font-semibold md:text-lg">
              {benefit.title}
            </h2>
            <p className="max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
              {benefit.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
