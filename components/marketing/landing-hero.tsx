"use client";

import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { SignInPromptDialog } from "@/components/marketing/sign-in-prompt-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";

const HERO_STATS = [
  {
    Icon: BookOpen,
    line: "Your own notes",
    sub: "PDF, Word or photos",
  },
  {
    Icon: ClipboardCheck,
    line: "Quizzes from notes",
    sub: "Practice what you read",
  },
  {
    Icon: MessageCircle,
    line: "Tip the tutor",
    sub: "Quotes your material back",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Upload a note",
    text: "A lecture handout, a slide photo, a typed course. Tip reads it and pulls out the topics.",
    href: "/upload",
    cta: "Upload",
  },
  {
    step: "2",
    title: "Quiz yourself",
    text: "Generate questions from any note. Every question traces back to the part of your material it came from.",
    href: "/quizzes",
    cta: "See quizzes",
  },
  {
    step: "3",
    title: "Ask Tip",
    text: "Stuck on a paragraph? Tip quotes your note back to you, asks what you already tried, then teaches it.",
    href: "/chat",
    cta: "Open chat",
  },
] as const;

export function LandingHero() {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState("/chat");

  const openLoginPrompt = useCallback((href: string) => {
    setPendingHref(href);
    window.setTimeout(() => setLoginOpen(true), 0);
  }, []);

  const requireAuth = useCallback(
    (href: string) => {
      if (session?.user) {
        router.push(href);
        return;
      }
      openLoginPrompt(href);
    },
    [session?.user, router, openLoginPrompt],
  );

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    const href = trimmed ? `/chat?q=${encodeURIComponent(trimmed)}` : "/chat";
    requireAuth(href);
  };

  return (
    <>
      <section className="border-b bg-background pb-12 pt-10 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-foreground text-pretty text-[2rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
            Your lecture notes,{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text font-bold text-transparent">
              taught back to you
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
            Upload your course material. Tip studies it with you, quizzes you on
            it, and shows what you have not mastered yet. Built for university
            students in Cameroon.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto mt-8 w-full max-w-2xl"
          >
            <label htmlFor="landing-search" className="sr-only">
              Ask Tip a study question
            </label>
            <div className="relative">
              <Input
                id="landing-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Tip something from your course…"
                className="border-border bg-background h-12 w-full rounded-full border-2 px-4 pr-[3.25rem] text-[15px] shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/75 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15 sm:h-14 sm:px-5 sm:pr-14 sm:text-base"
                autoComplete="off"
              />
              <button
                type="submit"
                aria-label="Continue to study chat"
                className="bg-foreground text-background hover:bg-foreground/90 absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:right-2 sm:size-10"
              >
                <ArrowRight className="size-4 sm:size-[1.15rem]" aria-hidden />
              </button>
            </div>
            <p className="text-muted-foreground/90 mt-2.5 text-center text-xs sm:text-[13px]">
              Continue opens Tip study chat after sign-in · Enter works too
            </p>
          </form>

          <div className="text-muted-foreground mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:flex-wrap sm:gap-10 md:gap-14">
            {HERO_STATS.map(({ Icon, line, sub }) => (
              <div
                key={line}
                className="flex items-center gap-3 text-left sm:text-center"
              >
                <span className="border-border bg-muted/50 flex size-10 shrink-0 items-center justify-center rounded-full border">
                  <Icon
                    className="text-foreground size-[1.1rem]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-foreground text-sm font-semibold">
                    {line}
                  </p>
                  <p className="text-muted-foreground text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {!session?.user && (
            <p className="text-muted-foreground mt-6 text-sm">
              <Link
                href="/sign-in"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href="/sign-up"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Create account
              </Link>
            </p>
          )}
        </div>

        <div className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16 md:mt-20">
          <div className="border-border bg-card scroll-mt-24 rounded-2xl border p-5 shadow-md sm:p-7 md:p-9 md:rounded-3xl">
            <div className="mb-8">
              <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                How studying here works
              </h2>
              <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-relaxed">
                Three steps, one loop. Your material stays yours; Tip only ever
                teaches from what you uploaded.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 lg:gap-6">
              {STEPS.map((item) => (
                <Card
                  key={item.step}
                  className="flex flex-col rounded-2xl border-0 shadow-md ring-1 ring-border/80"
                >
                  <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                    <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-bold">
                      {item.step}
                    </span>
                    <h3 className="text-foreground font-semibold leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                      {item.text}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-1 w-full rounded-xl border-border font-semibold"
                      type="button"
                      onClick={() => requireAuth(item.href)}
                    >
                      {item.cta}
                      <ArrowRight
                        className="ml-2 size-4 shrink-0 opacity-70"
                        aria-hidden
                      />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SignInPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        callbackUrl={pendingHref}
      />
    </>
  );
}
