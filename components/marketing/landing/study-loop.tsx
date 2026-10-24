import { ArrowRight, Brain, FileText, Target, TrendingUp } from "lucide-react";

const STEPS = [
  {
    title: "Add your materials",
    body: "Upload your notes, slides or handouts.",
    Icon: FileText,
  },
  {
    title: "Understand the topic",
    body: "Get clear explanations from Tip.",
    Icon: Brain,
  },
  {
    title: "Practise with purpose",
    body: "Take quizzes and answer questions.",
    Icon: Target,
  },
  {
    title: "Review what needs work",
    body: "See what needs work and plan your next step.",
    Icon: TrendingUp,
  },
] as const;

export function LandingStudyLoop() {
  return (
    <section
      id="tools"
      className="scroll-mt-20 border-b border-border bg-primary/5 px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1120px] space-y-10">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Your study loop
          </p>
          <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-[2.6rem]">
            A simple cycle for{" "}
            <span className="font-serif text-primary italic">
              better learning.
            </span>
          </h2>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                  <step.Icon className="h-5 w-5 text-primary" />
                </span>
                {index < STEPS.length - 1 ? (
                  <ArrowRight className="hidden h-4 w-4 text-primary/40 lg:block" />
                ) : null}
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
