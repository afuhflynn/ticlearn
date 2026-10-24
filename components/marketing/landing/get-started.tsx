import { Check, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CHECKLIST = [
  "Text is extracted from your document",
  "You get relevant explanations",
  "Generate practice questions",
  "Track your progress",
] as const;

export function LandingGetStarted() {
  return (
    <section
      id="start"
      className="scroll-mt-20 border-b border-border bg-muted/30 px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto grid w-full max-w-[1120px] gap-8 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Get started
          </p>
          <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-[2.4rem]">
            Your lecturer&apos;s notes are the{" "}
            <span className="font-serif text-primary italic">
              starting point.
            </span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Courses vary by institution, programme and lecturer. TiCLearn starts
            with the materials you have, rather than assuming every student
            follows the same syllabus.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </span>
          <h3 className="text-base font-semibold">Upload your materials</h3>
          <p className="text-sm text-muted-foreground">
            Upload a PDF, a photo or a Word file once you have signed in.
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, images and other supported formats
          </p>
          <Button asChild className="mt-2 min-h-12 w-full">
            <Link href="/sign-up">Upload file</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">
            Then start your study session
          </h3>
          <ul className="mt-4 space-y-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
