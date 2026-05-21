"use client";

import { Fragment, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  FileStack,
  Timer,
  Trophy,
} from "lucide-react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import type { GceCountdownSnapshot } from "@/lib/gce-countdown";
import { QUICK_ACTIONS, SAMPLE_MOCKS } from "@/constants/landing";
import { SignInPromptDialog } from "@/components/marketing/sign-in-prompt-dialog";
import { GceCountdownInline } from "@/components/marketing/gce-countdown-inline";

const STAT_ITEMS = [
  {
    Icon: ClipboardList,
    headline: "Paper 1 & 2",
    sub: "Full mock papers",
  },
  {
    Icon: FileStack,
    headline: "GCE-aligned",
    sub: "Cameroon syllabus",
  },
  {
    Icon: Timer,
    headline: "Timed",
    sub: "Auto-save attempts",
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
  const [pendingHref, setPendingHref] = useState("/practice/mock");

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
    const href = trimmed
      ? `/chat?q=${encodeURIComponent(trimmed)}`
      : "/chat";
    requireAuth(href);
  };

  const mockCtaLabel = session?.user ? "Continue to mocks" : "Sign in to view";

  return (
    <>
      <section id="sample-mocks" className="border-b bg-muted/35">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pb-14 sm:pt-10 md:pb-20 md:pt-12">
          {/* Headline → blurb → countdown → primary search live in one column */}
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 text-center sm:gap-4 md:gap-5">
            <h1 className="text-pretty text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl sm:leading-snug md:text-5xl">
              Prepare for{" "}
              <span className="text-foreground">GCE Papers 1 &amp; 2</span>
              {" with "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text font-bold text-transparent">
                TiCLearn
              </span>
            </h1>
            <p className="max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base md:max-w-3xl md:text-lg">
              Multiple-choice Paper 1 and structured Paper 2 mocks, timed runs,
              and support from TiC when you need clarification.
            </p>
            <GceCountdownInline initial={countdown} />

            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full max-w-none flex-col gap-3 pt-2 md:gap-0 md:pt-2"
            >
              <label htmlFor="landing-search" className="sr-only">
                Ask TiC
              </label>
              <div className="flex min-h-[3rem] w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 py-2 shadow-md focus-within:ring-2 focus-within:ring-ring/35 sm:min-h-[3.5rem] md:min-h-[4rem] md:rounded-full md:gap-4 md:pl-6 md:pr-2.5 md:shadow-lg">
                <FaMagnifyingGlass className="size-4 shrink-0 text-muted-foreground md:size-5" />
                <Input
                  id="landing-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Topic to revise…"
                  className="h-auto min-h-0 flex-1 border-0 bg-transparent py-2.5 text-[16px] leading-snug shadow-none placeholder:text-[13px] placeholder:text-muted-foreground/75 focus-visible:ring-0 sm:placeholder:text-[15px] md:py-3.5 md:text-lg md:placeholder:text-base"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="hidden shrink-0 rounded-full px-8 text-base font-semibold md:inline-flex"
                >
                  Ask TiC
                </Button>
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-2xl text-base font-semibold shadow-sm md:hidden"
              >
                Ask TiC
              </Button>
            </form>
          </div>

          <div className="mx-auto mt-7 max-w-4xl rounded-2xl border border-border/80 bg-muted/40 px-3 py-4 sm:mt-9 sm:px-5 md:mt-10 md:px-7 md:py-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-8">
              <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:flex sm:flex-wrap sm:justify-center md:flex-nowrap md:justify-start">
                {STAT_ITEMS.map(({ Icon, headline, sub }) => (
                  <div
                    key={headline}
                    className="flex items-center gap-3 text-left text-muted-foreground"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm md:size-11">
                      <Icon className="size-[1.15rem]" strokeWidth={1.5} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground md:text-[15px]">
                        {headline}
                      </p>
                      <p className="text-xs md:text-sm">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center md:w-auto md:min-w-[11rem] md:flex-col md:flex-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-11 w-full rounded-xl sm:flex-1 md:h-10 md:w-full md:flex-none md:rounded-full md:min-w-[11rem]"
                  onClick={() => requireAuth("/practice/mock")}
                >
                  Practice mocks
                  <ArrowRight className="ml-2 size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-11 w-full rounded-xl sm:flex-1 md:h-10 md:w-full md:flex-none md:rounded-full md:min-w-[11rem]"
                  onClick={() => requireAuth("/leaderboard")}
                >
                  Leaderboard
                  <Trophy className="ml-2 size-4 opacity-70" aria-hidden />
                </Button>
              </div>
            </div>

            <nav
              aria-label="Quick links"
              className="border-t border-border/70 pt-4 md:pt-5"
            >
              <div className="flex flex-col gap-2 sm:hidden">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={`min-h-[2.75rem] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-left text-[14px] leading-snug underline-offset-4 transition-colors hover:bg-background hover:underline active:bg-muted ${action.featured ? "border-primary/35 font-semibold text-primary" : "font-medium text-foreground/90"}`}
                    onClick={() => requireAuth(action.href)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="hidden flex-wrap items-center justify-center gap-y-2 text-center text-sm sm:flex">
                {QUICK_ACTIONS.map((action, idx) => (
                  <Fragment key={action.id}>
                    {idx > 0 ? (
                      <span className="mx-3 text-muted-foreground" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={`underline-offset-4 hover:underline ${action.featured ? "font-semibold text-primary" : "font-medium text-foreground/90"}`}
                      onClick={() => requireAuth(action.href)}
                    >
                      {action.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            </nav>
          </div>

          <div className="mx-auto mt-10 max-w-6xl rounded-2xl border border-border bg-card p-4 shadow-lg sm:mt-12 sm:rounded-3xl sm:p-6 md:mt-14 md:p-10">
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between md:mb-10">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
                  Sample paper formats
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  Typical layouts for Paper 1 and Paper 2 on TiCLearn—structure,
                  timing, and mark bands students use every week.
                </p>
              </div>
              {session?.user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 self-start text-muted-foreground hover:text-foreground sm:-ml-3 sm:self-auto"
                  asChild
                >
                  <Link href="/practice/mock">
                    Browse all mocks
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 self-start text-muted-foreground hover:text-foreground sm:-ml-3 sm:self-auto"
                  onClick={() => openLoginPrompt("/practice/mock")}
                >
                  Browse all mocks
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SAMPLE_MOCKS.map((mock) => (
                <Card
                  key={mock.id}
                  className="overflow-hidden rounded-2xl border-0 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg"
                >
                  <div className="flex min-h-[6.5rem] flex-col justify-center bg-gradient-to-br from-primary via-violet-500 to-primary px-3 py-4 text-center text-primary-foreground sm:min-h-[7.75rem] sm:px-4 sm:py-6">
                    <span className="text-[11px] font-semibold uppercase tracking-wider opacity-95">
                      Practice paper
                    </span>
                    <span className="mt-2 line-clamp-2 text-lg font-bold leading-tight">
                      {mock.subject}
                    </span>
                    <span className="mt-1 text-sm opacity-95">
                      {mock.paper} · {mock.paperType}
                    </span>
                  </div>

                  <CardContent className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {mock.level}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {mock.durationMin} min
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs tabular-nums font-medium text-muted-foreground">
                        {mock.questionCount} q · {mock.totalMarks} marks
                      </span>
                    </div>
                    <h3 className="font-semibold leading-snug text-foreground">
                      {mock.shortTitle}
                    </h3>
                    <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {mock.description}
                    </p>
                    <div className="flex items-center gap-3 border-t border-border pt-4">
                      <Avatar className="size-9 border border-border bg-muted">
                        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                          TL
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-muted-foreground">
                        TiCLearn
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      className="mt-auto w-full rounded-xl border border-border bg-muted/70 font-semibold hover:bg-muted"
                      type="button"
                      onClick={() => requireAuth("/practice/mock")}
                    >
                      {mockCtaLabel}
                      <ArrowRight className="ml-2 size-4 shrink-0" aria-hidden />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {!session?.user && (
            <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
              <Link
                href="/sign-in"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
              {" or "}
              <Link
                href="/sign-up"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                sign up free
              </Link>
              {" to save mocks and leaderboard progress"}
            </p>
          )}
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
