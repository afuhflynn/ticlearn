"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import type { GceCountdownSnapshot } from "@/lib/gce-countdown";
import { SAMPLE_MOCKS } from "@/constants/landing";
import { SignInPromptDialog } from "@/components/marketing/sign-in-prompt-dialog";
import { GceCountdownInline } from "@/components/marketing/gce-countdown-inline";

const HERO_STATS = [
  {
    Icon: GraduationCap,
    line: "GCE A-Level",
    sub: "Cameroon syllabus",
  },
  {
    Icon: BookOpen,
    line: "Paper 1 & 2",
    sub: "MCQ & structured",
  },
  {
    Icon: Sparkles,
    line: "TiC tutor",
    sub: "Search any topic",
  },
] as const;

type LandingHeroProps = {
  countdown: GceCountdownSnapshot;
};

export function LandingHero({ countdown }: LandingHeroProps) {
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

  const mockCtaLabel = session?.user ? "Open mock" : "Sign in to start";

  return (
    <>
      {/* Hero: Sabi-style — headline, one line, search hub, stats */}
      <section className="border-b bg-background pb-12 pt-10 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-foreground text-pretty text-[2rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
            Prepare for GCE with{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text font-bold text-transparent">
              TiCLearn
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
            Search to study with TiC, or open a timed mock below—same flow as your dashboard
            after you sign in.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto mt-8 w-full max-w-2xl"
          >
            <label htmlFor="landing-search" className="sr-only">
              Search topics or questions
            </label>
            <div className="border-border bg-card flex min-h-[3.25rem] items-stretch gap-1 rounded-2xl border-2 p-1.5 shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 sm:min-h-[3.5rem] sm:rounded-full sm:pl-2">
              <Input
                id="landing-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to revise? (e.g. organic chemistry, loops, integration…)"
                className="min-h-11 flex-1 border-0 bg-transparent px-3 text-[15px] shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0 sm:min-h-12 sm:px-4 sm:text-base"
                autoComplete="off"
              />
              <Button
                type="submit"
                className="h-11 shrink-0 gap-2 rounded-xl px-5 font-semibold sm:h-[calc(100%-2px)] sm:rounded-full sm:px-7"
                size="lg"
              >
                <Sparkles className="size-4" aria-hidden />
                Ask TiC
              </Button>
            </div>
          </form>

          <div className="text-muted-foreground mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:flex-wrap sm:gap-10 md:gap-14">
            {HERO_STATS.map(({ Icon, line, sub }) => (
              <div
                key={line}
                className="flex items-center gap-3 text-left sm:text-center"
              >
                <span className="border-border bg-muted/50 flex size-10 shrink-0 items-center justify-center rounded-full border">
                  <Icon className="text-foreground size-[1.1rem]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-foreground text-sm font-semibold">{line}</p>
                  <p className="text-muted-foreground text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <GceCountdownInline
            initial={countdown}
            className="mt-8 text-xs text-muted-foreground sm:text-sm"
          />

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

        {/* Ready mocks — “From the community” style block */}
        <div className="mx-auto mt-14 max-w-6xl px-4 sm:mt-16 md:mt-20">
          <div
            id="ready-mocks"
            className="border-border bg-card rounded-2xl border p-5 shadow-md sm:p-7 md:p-9 md:rounded-3xl"
          >
            <div className="mb-8 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                  Ready mocks
                </h2>
                <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-relaxed">
                  Example Paper 1 and Paper 2 formats students open every week—full runs live in
                  the app.
                </p>
              </div>
              {session?.user ?
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground shrink-0 gap-1 self-start sm:self-auto"
                  asChild
                >
                  <Link href="/practice/mock">
                    View all
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground shrink-0 gap-1 self-start sm:self-auto"
                  onClick={() => openLoginPrompt("/practice/mock")}
                >
                  View all
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {SAMPLE_MOCKS.map((mock) => (
                <Card
                  key={mock.id}
                  className="flex flex-col overflow-hidden rounded-2xl border-0 shadow-md ring-1 ring-border/80 transition-shadow hover:shadow-lg"
                >
                  <div className="flex min-h-[5.75rem] flex-col justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-4 py-4 text-white sm:min-h-[6.25rem]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider opacity-95">
                      Practice paper
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-base font-bold leading-snug sm:text-lg">
                      {mock.subject}
                    </span>
                    <span className="mt-1 text-xs opacity-95 sm:text-sm">
                      {mock.paper} · {mock.paperType}
                    </span>
                  </div>

                  <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="bg-muted rounded-full px-2.5 py-0.5 font-medium">
                        {mock.level}
                      </span>
                      <span className="bg-muted rounded-full px-2.5 py-0.5">
                        {mock.durationMin} min
                      </span>
                      <span className="bg-muted rounded-full px-2.5 py-0.5 tabular-nums">
                        {mock.questionCount} q · {mock.totalMarks} m
                      </span>
                    </div>
                    <h3 className="text-foreground font-semibold leading-snug">
                      {mock.shortTitle}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 flex-1 text-sm leading-relaxed">
                      {mock.description}
                    </p>
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      <Avatar className="size-8 border border-border">
                        <AvatarFallback className="bg-muted text-[10px] font-semibold">
                          TL
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-muted-foreground">TiCLearn</span>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-1 w-full rounded-xl border-border font-semibold"
                      type="button"
                      onClick={() => requireAuth("/practice/mock")}
                    >
                      {mockCtaLabel}
                      <ArrowRight className="ml-2 size-4 shrink-0 opacity-70" aria-hidden />
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
