import Link from "next/link";
import { GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-20 px-4 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-1.5 text-sm backdrop-blur">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>AI-Powered Learning</span>
      </div>

      <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
        Study Smarter,{" "}
        <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          Score Higher
        </span>
      </h1>

      <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
        Transform your notes into quizzes, prepare for GCE A-Level exams,
        compete on leaderboards, and chat with an AI tutor.
      </p>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button size="lg" className="gap-2" asChild>
          <Link href="/sign-up">
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/pricing">View Pricing</Link>
        </Button>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4 max-w-4xl">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary md:text-4xl">10x</div>
          <div className="text-sm text-muted-foreground">Faster Revision</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary md:text-4xl">95%</div>
          <div className="text-sm text-muted-foreground">Satisfaction</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary md:text-4xl">
            500+
          </div>
          <div className="text-sm text-muted-foreground">Quizzes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary md:text-4xl">
            24/7
          </div>
          <div className="text-sm text-muted-foreground">AI Tutor</div>
        </div>
      </div>
    </div>
  );
}
