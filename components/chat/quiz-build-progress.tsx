"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { smallerRetryCount } from "@/lib/ai/validators";
import { cn } from "@/lib/utils";

type BuildQuiz = {
  id: string;
  status: "GENERATING" | "READY" | "ERROR";
  buildStage?: string | null;
  builtCount?: number | null;
  buildTotal?: number | null;
  buildError?: string | null;
  buildStartedAt?: string | null;
};

function stageLabel(stage: string | null | undefined): string {
  if (stage === "QUEUED") return "Queued";
  if (stage === "SAVING") return "Saving your quiz";
  return "Building your quiz";
}

export function QuizBuildProgress({
  quiz,
  showLink = true,
  className,
}: {
  quiz: BuildQuiz | null | undefined;
  showLink?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const total = Math.max(quiz?.buildTotal ?? 0, 0);
  const built = Math.min(quiz?.builtCount ?? 0, total);
  const percent = total > 0 ? Math.floor((built / total) * 100) : 0;

  useEffect(() => {
    if (quiz?.status !== "GENERATING") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quiz?.status]);

  if (!quiz) return null;

  if (quiz.status === "ERROR") {
    const retryCount = smallerRetryCount(total);
    return (
      <div data-slot="quiz-build-error" className={cn("space-y-3", className)}>
        <p className="font-medium">
          Practice paused here, two ways to continue.
        </p>
        <p className="text-sm text-muted-foreground">
          {quiz.buildError ??
            "That set came out too long, so it stopped short."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {retryCount !== null ? (
            <Button asChild>
              <Link
                href={`/quizzes/new?retryQuizId=${quiz.id}&count=${retryCount}`}
              >
                Try {retryCount} questions now
              </Link>
            </Button>
          ) : null}
          {showLink ? (
            <Button variant="outline" asChild>
              <Link href={`/quizzes/${quiz.id}`}>Open full quiz page</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (quiz.status !== "GENERATING") return null;

  const startedAt = quiz.buildStartedAt
    ? new Date(quiz.buildStartedAt).getTime()
    : null;
  const elapsedSecs =
    startedAt && Number.isFinite(startedAt)
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : null;
  const showElapsed = elapsedSecs !== null && elapsedSecs >= 10;

  return (
    <div data-slot="quiz-build-progress" className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{stageLabel(quiz.buildStage)}</span>
        <span className="text-muted-foreground tabular-nums">
          {built} of {total} · {percent}%
        </span>
      </div>
      <Progress value={percent} className="h-1.5" />
      <span className="sr-only">
        {stageLabel(quiz.buildStage)}, {percent} percent complete
      </span>
      {showElapsed ? (
        <p className="text-xs text-muted-foreground">
          Building for {elapsedSecs} seconds.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        This view refreshes on its own until the quiz is ready.
      </p>
    </div>
  );
}
