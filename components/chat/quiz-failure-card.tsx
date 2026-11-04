"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { LiveRegion } from "@/components/ui/live-region";

export type FailureKind = "build" | "draw" | "grade";

function causeLine(kind: FailureKind): string {
  if (kind === "draw") return "Could not draw that. Steps below.";
  if (kind === "grade") return "Could not mark that. Two ways to continue.";
  return "That set came out too long, so it stopped short.";
}

function buildQuizHref(input: {
  noteId: string | null;
  topicText: string | null;
  count: number | null;
  formatChoice: string | null;
  level?: string | null;
  difficulty?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.noteId) params.set("noteId", input.noteId);
  if (input.topicText) params.set("topic", input.topicText);
  if (input.count !== null && input.count !== undefined)
    params.set("count", String(input.count));
  if (input.formatChoice) params.set("format", input.formatChoice);
  if (input.level) params.set("level", input.level);
  if (input.difficulty) params.set("difficulty", input.difficulty);
  const query = params.toString();
  return query ? `/quizzes?${query}` : "/quizzes";
}

/**
 * One calm card for every quiz failure in chat. The same frame covers a
 * build cutoff, a draw miss and a grading error, with plain words and two
 * live exits to the full quiz page. Plain links survive reload where turn
 * memory does not.
 */
export function QuizFailureCard({
  kind,
  askedCount,
  smallerCount,
  noteId,
  topicText,
  formatChoice,
  level,
  difficulty,
  clientRunId,
  quizId,
}: {
  kind: FailureKind;
  askedCount: number;
  smallerCount: number | null;
  noteId: string | null;
  topicText: string | null;
  formatChoice: string | null;
  level?: string | null;
  difficulty?: string | null;
  clientRunId?: string | null;
  quizId?: string | null;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const showSmall =
    smallerCount !== null && smallerCount !== askedCount && smallerCount > 0;
  const smallHref = showSmall
    ? buildQuizHref({
        noteId,
        topicText,
        count: smallerCount,
        formatChoice,
        level,
        difficulty,
      })
    : null;
  const fullHref = buildQuizHref({
    noteId,
    topicText,
    count: askedCount,
    formatChoice,
    level,
    difficulty,
  });

  useEffect(() => {
    if (!clientRunId) return;
    if (typeof window === "undefined") return;
    const seenKey = `ticlearn:quiz:failure-seen:${clientRunId}`;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(seenKey) === "1";
    } catch {
      seen = false;
    }
    if (!seen) {
      titleRef.current?.focus({ preventScroll: true });
      try {
        window.sessionStorage.setItem(seenKey, "1");
      } catch {
        return;
      }
    }
  }, [clientRunId]);

  useEffect(() => {
    if (!clientRunId) return;
    if (typeof window === "undefined") return;
    const loggedKey = `ticlearn:quiz:failure-logged:${clientRunId}:${kind}`;
    let logged = false;
    try {
      logged = window.sessionStorage.getItem(loggedKey) === "1";
    } catch {
      return;
    }
    if (logged) return;
    if (Math.random() >= 0.1) return;
    try {
      window.sessionStorage.setItem(loggedKey, "1");
    } catch {
      return;
    }
    void fetch("/api/prompts/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "prompt_shown",
        surface: "quiz",
        kind: `failure:${kind}`,
        used: askedCount,
        metadata: {
          cause: kind,
          count: askedCount,
          format: formatChoice ?? "unknown",
          quizId: quizId ?? null,
        },
      }),
    }).catch(() => null);
  }, [clientRunId, kind, askedCount, formatChoice, quizId]);

  const guardOffline = (event: React.SyntheticEvent) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      event.preventDefault();
      setOfflineNotice("You are offline. Reconnect, then try again.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[48rem] px-4">
      <Card className="w-full">
        <CardContent className="space-y-4 pt-6">
          <CardTitle
            ref={titleRef}
            tabIndex={-1}
            className="text-base outline-none"
          >
            Practice paused
          </CardTitle>
          <LiveRegion>
            <p className="text-sm text-muted-foreground">{causeLine(kind)}</p>
          </LiveRegion>
          {showSmall ? null : (
            <p className="text-sm text-muted-foreground">
              Small set unavailable, open the full set.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {showSmall && smallHref ? (
              <Button asChild className="w-full">
                <Link href={smallHref} onClick={guardOffline} prefetch={false}>
                  Try smaller quiz
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant={showSmall ? "outline" : "default"}
              className="w-full"
            >
              <Link href={fullHref} onClick={guardOffline} prefetch={false}>
                Open full quiz
              </Link>
            </Button>
          </div>
          {offlineNotice ? (
            <p className="text-sm text-muted-foreground">{offlineNotice}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
