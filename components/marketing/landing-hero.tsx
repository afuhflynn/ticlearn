"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import type { GceCountdownSnapshot } from "@/lib/gce-countdown";
import { SignInPromptDialog } from "@/components/marketing/sign-in-prompt-dialog";
import { GceCountdownInline } from "@/components/marketing/gce-countdown-inline";
import type { PublicBlueprintCard } from "@/lib/public-gce-catalog";

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
    Icon: MessageCircle,
    line: "TiC tutor",
    sub: "Search any topic",
  },
] as const;

type PublicMockModule = {
  id: string;
  title: string;
  description: string | null;
  items: Array<{ id: string; blueprint: PublicBlueprintCard }>;
};

type LandingHeroProps = {
  countdown: GceCountdownSnapshot;
};

function MockCatalogCard({
  bp,
  mockCtaLabel,
  onOpenPractice,
}: {
  bp: PublicBlueprintCard;
  mockCtaLabel: string;
  onOpenPractice: () => void;
}) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-0 shadow-md ring-1 ring-border/80 transition-shadow hover:shadow-lg">
      <div className="flex min-h-[5.75rem] flex-col justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-4 py-4 text-white sm:min-h-[6.25rem]">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-95">
          {bp.paperStyle} · {bp.questionCount} questions
        </span>
        <span className="mt-1.5 line-clamp-2 text-base font-bold leading-snug sm:text-lg">
          {bp.subjectLabel}
        </span>
        <span className="mt-1 line-clamp-1 text-xs opacity-95 sm:text-sm">
          {bp.name}
        </span>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="bg-muted rounded-full px-2.5 py-0.5 font-medium">
            {bp.componentName}
          </span>
          <span className="bg-muted rounded-full px-2.5 py-0.5">
            {bp.durationMin} min
          </span>
          <span className="bg-muted rounded-full px-2.5 py-0.5 tabular-nums">
            {bp.totalMarks} marks
          </span>
        </div>
        <h3 className="text-foreground line-clamp-2 font-semibold leading-snug">
          {bp.name}
        </h3>
        {bp.description ? (
          <p className="text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed">
            {bp.description}
          </p>
        ) : (
          <p className="text-muted-foreground flex-1 text-sm italic opacity-80">
            Timed practice for {bp.programName}.
          </p>
        )}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Avatar className="size-8 border border-border">
            <AvatarFallback className="bg-muted text-[10px] font-semibold">
              TL
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-muted-foreground">
            TiCLearn
          </span>
        </div>
        <Button
          variant="outline"
          className="mt-1 w-full rounded-xl border-border font-semibold"
          type="button"
          onClick={onOpenPractice}
        >
          {mockCtaLabel}
          <ArrowRight className="ml-2 size-4 shrink-0 opacity-70" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}

function ModuleGroupsSkeleton() {
  return (
    <div className="space-y-10">
      {[0, 1].map((m) => (
        <div key={m} className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {[0, 1, 2, 3].map((i) => (
              <Card
                key={i}
                className="overflow-hidden rounded-2xl border-0 shadow-md ring-1 ring-border/80"
              >
                <Skeleton className="h-[5.75rem] w-full rounded-none sm:h-[6.25rem]" />
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LandingHero({ countdown }: LandingHeroProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState("/chat");

  const [blueprints, setBlueprints] = useState<PublicBlueprintCard[]>([]);
  const [mockModules, setMockModules] = useState<PublicMockModule[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);

  const blueprintIdsInGroups = useMemo(() => {
    const s = new Set<string>();
    for (const mod of mockModules) {
      for (const it of mod.items) {
        s.add(it.blueprint.id);
      }
    }
    return s;
  }, [mockModules]);

  const orphanBlueprints = useMemo(
    () => blueprints.filter((bp) => !blueprintIdsInGroups.has(bp.id)),
    [blueprints, blueprintIdsInGroups],
  );

  const fetchCatalog = useCallback(() => {
    setCatalogLoading(true);
    setCatalogError(false);
    Promise.all([
      fetch("/api/public/p1p2-mock-modules").then(async (r) => ({
        ok: r.ok,
        json: await r.json().catch(() => ({})),
      })),
      fetch("/api/public/gce-blueprints").then(async (r) => ({
        ok: r.ok,
        json: await r.json().catch(() => ({})),
      })),
    ])
      .then(([mRes, bRes]) => {
        const mods =
          mRes.ok && Array.isArray(mRes.json?.modules) ? mRes.json.modules : [];
        const bps =
          bRes.ok && Array.isArray(bRes.json?.blueprints)
            ? bRes.json.blueprints
            : [];
        setMockModules(mods as PublicMockModule[]);
        setBlueprints(bps as PublicBlueprintCard[]);
        const modulesFailed = !mRes.ok || !Array.isArray(mRes.json?.modules);
        const blueprintsFailed =
          !bRes.ok || !Array.isArray(bRes.json?.blueprints);
        setCatalogError(modulesFailed && blueprintsFailed);
      })
      .catch(() => {
        setCatalogError(true);
        setMockModules([]);
        setBlueprints([]);
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
      <section className="border-b bg-background pb-12 pt-10 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-foreground text-pretty text-[2rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl md:leading-[1.1]">
            Prepare for GCE with{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text font-bold text-transparent">
              TiCLearn
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed sm:text-base">
            Search to study with TiC, or jump into a real timed mock below—the
            same catalog students see after sign-in.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mx-auto mt-8 w-full max-w-2xl"
          >
            <label htmlFor="landing-search" className="sr-only">
              Search topics or questions for study chat
            </label>
            <div className="relative">
              <Input
                id="landing-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to revise? (e.g. organic chemistry, loops…)"
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
              Continue opens TiC study chat after sign-in · Enter works too
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

          <div className="border-primary/25 bg-primary/[0.06] ring-primary/10 mx-auto mt-9 max-w-xl rounded-2xl border px-4 py-4 shadow-sm ring-1 sm:mt-10 sm:px-6 sm:py-5">
            <p className="text-primary mb-2 text-center text-xs font-semibold uppercase tracking-wide">
              Next sitting
            </p>
            <GceCountdownInline initial={countdown} emphasis />
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
          <div
            id="ready-mocks"
            className="border-border bg-card scroll-mt-24 rounded-2xl border p-5 shadow-md sm:p-7 md:p-9 md:rounded-3xl"
          >
            <div className="mb-8 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                  Mocks open to students
                </h2>
                <p className="text-muted-foreground mt-1 max-w-lg text-sm leading-relaxed">
                  Curated mock groups your school enables for learners, plus
                  other student-visible papers from the catalog.
                </p>
              </div>
              {session?.user ? (
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
              ) : (
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

            {catalogLoading ? (
              <ModuleGroupsSkeleton />
            ) : catalogError ? (
              <p className="text-muted-foreground text-center text-sm">
                Could not load the mock catalog.{" "}
                <button
                  type="button"
                  className="text-foreground font-medium underline underline-offset-4"
                  onClick={() => fetchCatalog()}
                >
                  Retry
                </button>
              </p>
            ) : mockModules.length === 0 && orphanBlueprints.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                No published mock groups or papers yet—ask your admin to mark
                bundles and blueprints as visible to students, or{" "}
                <Link
                  href="/sign-up"
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  sign up
                </Link>{" "}
                to use bespoke generation.
              </p>
            ) : (
              <div className="space-y-12">
                {mockModules.map((mod) => (
                  <section
                    key={mod.id}
                    className="border-border/60 last:border-b-0 border-b pb-10 last:pb-0"
                  >
                    <div className="mb-5 flex gap-3">
                      <Layers
                        className="text-primary mt-0.5 size-6 shrink-0"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <h3 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
                          {mod.title}
                        </h3>
                        {mod.description ? (
                          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-relaxed">
                            {mod.description}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground/90 mt-2 text-xs font-medium">
                          School mock group · same order as Practice → Mock
                          exams
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                      {mod.items.map(({ id, blueprint: bp }) => (
                        <MockCatalogCard
                          key={id}
                          bp={bp}
                          mockCtaLabel={mockCtaLabel}
                          onOpenPractice={() => requireAuth("/practice/mock")}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {orphanBlueprints.length > 0 ? (
                  <div>
                    {mockModules.length > 0 ? (
                      <h3 className="text-foreground mb-5 text-lg font-semibold tracking-tight">
                        More practice papers
                      </h3>
                    ) : null}
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                      {orphanBlueprints.map((bp) => (
                        <MockCatalogCard
                          key={bp.id}
                          bp={bp}
                          mockCtaLabel={mockCtaLabel}
                          onOpenPractice={() => requireAuth("/practice/mock")}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
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
