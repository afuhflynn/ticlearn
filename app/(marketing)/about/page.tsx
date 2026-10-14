import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About TiCLearn - AI Study Platform by Tic Foundation",
  description:
    "Learn about TiCLearn, developed by Tic Foundation to help Cameroonian university students study their own lecture notes with AI-powered tools.",
  keywords: [
    "TiCLearn about",
    "Tic Foundation",
    "University study Cameroon",
    "AI study platform Cameroon",
  ],
  openGraph: {
    title: "About TiCLearn - Study Help for University Students",
    description:
      "Discover how TiCLearn helps university students in Cameroon learn from their own lecture notes.",
  },
};

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
            Empowering Cameroonian university students with AI tools that teach
            from their own lecture notes.
          </p>
        </section>

        {/* Mission */}
        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Our Mission</h2>
            <p className="text-muted-foreground">
              We believe every Cameroonian student deserves access to
              high-quality educational resources. TiCLearn bridges the gap
              between traditional learning and modern AI technology, helping
              students understand their own courses instead of memorising.
            </p>
          </div>
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p className="text-muted-foreground">
              To become the leading educational platform in Central Africa,
              transforming how students prepare for exams through innovative
              technology and personalized learning experiences.
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
              Founded by TIC Foundation, a nonprofit organization dedicated to
              advancing technology and education in Cameroon, TiCLearn combines
              the power of artificial intelligence with deep understanding of
              the local educational context. Our team includes experienced
              educators, software engineers, and passionate students who
              remember the challenges of keeping up with university courses.
            </p>
            <p className="text-muted-foreground">
              Today, we serve thousands of students across Cameroon and beyond,
              helping them study smarter, not harder. Our platform continues to
              evolve based on feedback from students and teachers, ensuring we
              always meet the needs of our community.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-center">Our Values</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-6 text-center">
              <Users className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Student-Centered</h3>
              <p className="text-sm text-muted-foreground">
                Every feature we build is designed with students in mind.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <GraduationCap className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Quality First</h3>
              <p className="text-sm text-muted-foreground">
                Accurate, relevant content that truly helps students succeed.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold">Innovation</h3>
              <p className="text-sm text-muted-foreground">
                Continuously improving with the latest AI technology.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl bg-primary/5 p-8 text-center md:p-12">
          <h2 className="mb-4 text-2xl font-bold">Join Our Community</h2>
          <p className="mb-6 text-muted-foreground">
            Start your journey to exam success today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
