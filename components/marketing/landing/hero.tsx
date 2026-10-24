import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The first screen, from spec 0015. Two links and no text input: the question
 * box was removed from the landing page on purpose, and `/chat` still opens
 * with a question when it is reached from elsewhere.
 */
export function LandingHero() {
  return (
    <section className="border-b border-border bg-primary/5 px-5 pt-10 pb-12 md:px-8 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="flex flex-col gap-5">
          <p className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-background px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
            For university &amp; HND students in Cameroon
          </p>

          <h1 className="text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-balance md:text-[3.1rem] lg:text-[3.6rem]">
            Make your course notes{" "}
            <span className="font-serif text-primary italic">make sense.</span>
          </h1>

          <p className="max-w-[34rem] text-base leading-relaxed text-muted-foreground md:text-[1.0625rem]">
            Bring your lecture notes, slides and handouts. Get clearer
            explanations, focused practice and feedback that helps you decide
            what to review next.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-12">
              <Link href="/sign-up">
                Start studying
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-12 bg-background"
            >
              <Link href="/#how">Explore how it works</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Built around your materials · Learn at your pace
          </p>
        </div>

        <div className="w-full">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-destructive/60" />
              <span className="h-2 w-2 rounded-full bg-primary/40" />
              <span className="h-2 w-2 rounded-full bg-chart-1/60" />
              <span className="ml-2 truncate rounded-sm bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                app.ticlearn.org
              </span>
            </div>
            <Image
              src="/marketing/note-view-1280.webp"
              alt="A note in TiCLearn for a second year Operating Systems course, showing the note title, the summary and the key points Tip pulled out."
              width={1280}
              height={800}
              sizes="(min-width: 1024px) 560px, 100vw"
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
