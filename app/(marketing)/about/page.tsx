import { ArrowRight, BookOpen, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "About TiCLearn · Tic Foundation",
  description:
    "Who builds TiCLearn, and why university students in Buea and Bamenda study their own lecture notes with Tip.",
  path: "/about",
  ogImage: "/og/about.png",
});

/**
 * The about page, from spec 0016 AC-9. It carries a true mission and story
 * under the landing honesty rules: no invented student numbers, no community
 * or ranking surfaces, no territory claims beyond the cities the product
 * actually speaks to. The closing actions are sign up and WhatsApp.
 */
export default function AboutPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Hero */}
        <section className="space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            About <span className="text-primary">TiCLearn</span>
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            A study tool for Cameroonian university students, built by Tic
            Foundation. You bring your own lecture notes, and Tip teaches from
            them.
          </p>
        </section>

        {/* Mission */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Our Mission</h2>
            <p className="text-muted-foreground">
              We believe every student learns best from their own course
              material. TiCLearn is built so a student can turn the notes they
              already sit on into summaries, practice, and a tutor that asks the
              right checking questions.
            </p>
          </div>
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">What TiCLearn is today</h2>
            <p className="text-muted-foreground">
              Three things, done well: upload a note and get a clear summary,
              turn a topic into a focused quiz, and study with Tip, an AI tutor
              that teaches instead of handing you answers.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Our Story</h2>
          <div className="prose prose-stone dark:prose-invert mx-auto">
            <p className="text-muted-foreground">
              TiCLearn was born from a simple observation: Cameroonian
              university students sit on piles of lecture notes and still study
              alone. Private tutoring is expensive, and generic study apps know
              nothing about their courses.
            </p>
            <p className="text-muted-foreground">
              TiCLearn is built by Tic Foundation, a nonprofit dedicated to
              advancing technology and education in Cameroon. The team includes
              educators, software engineers, and former students who remember
              how hard it is to keep up with university coursework on a tight
              budget and a phone.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-center">Our Values</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-6 text-center">
              <GraduationCap className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Student-Centered</h3>
              <p className="text-sm text-muted-foreground">
                Every feature we build is designed for the student on a phone,
                with data and connections in mind.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Tutor, not answer machine</h3>
              <p className="text-sm text-muted-foreground">
                Tip quotes your own note, asks before it explains, and makes the
                material stick rather than just answering.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <BookOpen className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Honest about limits</h3>
              <p className="text-sm text-muted-foreground">
                We publish the free limits and every claim on our pages has to
                be something we can back.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-primary/5 p-8 text-center md:p-12">
          <h2 className="mb-4 text-2xl font-bold">Start with one note today</h2>
          <p className="mb-6 text-muted-foreground">
            Upload a lecture note, get a summary, and let Tip take it from
            there. Questions first? We answer on WhatsApp.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Create a free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {WHATSAPP_GROUP_LABEL}
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
