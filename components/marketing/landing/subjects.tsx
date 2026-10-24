import {
  BookOpen,
  Briefcase,
  Code2,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

interface Subject {
  title: string;
  points: string[];
  Icon: LucideIcon;
  visual: ReactNode;
}

const SUBJECTS: Subject[] = [
  {
    title: "Computing & IT",
    points: ["Code snippets", "Algorithm questions", "Concept explanations"],
    Icon: Code2,
    visual: (
      <pre className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-[11px] leading-relaxed text-background">
        <code>{`function sum(a, b) {
  return a + b;
}`}</code>
      </pre>
    ),
  },
  {
    title: "Business & Management",
    points: ["Case studies", "Essay questions", "Short answers"],
    Icon: Briefcase,
    visual: (
      <div className="rounded-md bg-muted p-3 text-[11px] leading-relaxed">
        <p className="font-semibold">Case Study</p>
        <p className="text-muted-foreground">
          Analyse the key factors that influence market expansion in this
          scenario.
        </p>
      </div>
    ),
  },
  {
    title: "Science & Engineering",
    points: ["Calculations", "Diagrams", "Concept checks"],
    Icon: FlaskConical,
    visual: (
      <div className="flex items-center justify-center rounded-md bg-muted p-3">
        <span className="font-serif text-2xl text-primary italic">F = ma</span>
      </div>
    ),
  },
  {
    title: "Humanities & Social Sciences",
    points: ["Reading notes", "Structured answers", "Key concepts"],
    Icon: BookOpen,
    visual: (
      <div className="rounded-md bg-muted p-3 text-[11px] leading-relaxed">
        <p className="font-semibold">Key Concepts</p>
        <ul className="text-muted-foreground">
          <li>Social change</li>
          <li>Political systems</li>
          <li>Human development</li>
        </ul>
      </div>
    ),
  },
];

export function LandingSubjects() {
  return (
    <section
      id="students"
      className="scroll-mt-20 border-b border-border px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto w-full max-w-[1120px] space-y-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Explore subjects
          </p>
          <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight md:text-[2.6rem]">
            Made for{" "}
            <span className="font-serif text-primary italic">
              real coursework.
            </span>
          </h2>
          <p className="max-w-[36rem] text-sm text-muted-foreground md:text-base">
            Start from the material and practice format your course requires.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((subject) => (
            <li
              key={subject.title}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="space-y-3">
                <subject.Icon className="h-6 w-6 text-primary" />
                <h3 className="text-base font-semibold">{subject.title}</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {subject.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto">{subject.visual}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
