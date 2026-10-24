import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FREE_LIMITS } from "@/lib/plan-limits";

/**
 * The dark band closes the page. The free limits come from `FREE_LIMITS`, so a
 * changed limit changes the page, and the Mobile Money line is the real
 * payment path. No price and no number is printed here. The reset scope is
 * honest: notes and quizzes are lifetime counts on the free plan, and only
 * messages to Tip reset a day.
 */
export function LandingCtaBand() {
  return (
    <section id="free" className="scroll-mt-20 px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[1120px] rounded-xl bg-foreground px-6 py-8 text-background md:px-10 md:py-10">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Shape your future
            </p>
            <h2 className="text-[1.9rem] leading-[1.1] font-semibold tracking-tight md:text-[2.4rem]">
              Study with{" "}
              <span className="font-serif italic">more direction.</span>
            </h2>
            <p className="max-w-[34rem] text-sm leading-relaxed text-background/70 md:text-base">
              Start with the material you already have. Build understanding one
              topic at a time.
            </p>
          </div>
          <Button asChild size="lg" className="min-h-12 md:self-center">
            <Link href="/sign-up">
              Start studying
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 border-t border-background/15 pt-6 md:grid-cols-2">
          <p className="text-sm leading-relaxed text-background/80">
            Free to start: {FREE_LIMITS.pdfUploads} notes and{" "}
            {FREE_LIMITS.quizGenerations} quizzes to try, plus{" "}
            {FREE_LIMITS.aiTutorMessages} messages to Tip a day.
          </p>
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-background/80">
              Pay with MTN Mobile Money or Orange Money when you are ready. No
              card needed.
            </p>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-background underline-offset-4 hover:underline"
            >
              See the plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
