"use client";

import { useState } from "react";
import { QuizArt } from "@/components/art/quiz-art";
import { MathMarkdown } from "@/components/math-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateRetry, useRetry, useSubmitRetry } from "@/hooks";

export function RetryPanel({
  answerId,
  showArt = true,
}: {
  answerId: string;
  /** False on the quiz results page, which already shows its own QuizArt. */
  showArt?: boolean;
}) {
  // The pick belongs to one retry row. Keying it by retry id keeps a choice
  // made on an older retry (or on another answer's panel) from leaking into
  // the current one after a refetch or a fresh create.
  const [picked, setPicked] = useState<{
    retryId: string;
    option: string;
  } | null>(null);
  const retryQuery = useRetry(answerId);
  const retry = retryQuery.data?.retry ?? null;
  const createMutation = useCreateRetry(answerId);
  const submitMutation = useSubmitRetry(answerId, retry?.id ?? "");
  const activePick =
    picked && picked.retryId === retry?.id ? picked.option : null;

  if (retryQuery.isPending) {
    return (
      <div className="rounded-lg border p-3">
        <span className="sr-only">Loading retry</span>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (retryQuery.isError) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p>Retry did not load.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => void retryQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!retry) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">Turn this miss into proof</p>
        <p className="mt-1 text-muted-foreground">
          Get a short explanation with page proof plus one fresh question on the
          same idea.
        </p>
        <Button
          size="sm"
          className="mt-2"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Starting..." : "Start targeted retry"}
        </Button>
        {createMutation.isError ? (
          <p className="mt-2 text-destructive">
            Could not start the retry. Try again.
          </p>
        ) : null}
      </div>
    );
  }

  if (retry.status === "failed") {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">Retry needs another try</p>
        <p className="mt-1 text-muted-foreground">
          The helper could not build the fresh question. Your review is safe.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Starting..." : "Try again"}
        </Button>
      </div>
    );
  }

  if (retry.status === "pending" && !retry.retryQuestion) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <p>Building your fresh question...</p>
      </div>
    );
  }

  const completed = retry.status === "completed";

  return (
    <Card className="border-dashed">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Targeted retry</CardTitle>
          <Badge variant="secondary">{retry.concept}</Badge>
          {retry.sourcePages.map((page) => (
            <Badge key={page} variant="outline">
              Page {page}
            </Badge>
          ))}
          <Badge variant={completed ? "default" : "outline"}>
            {completed ? (retry.isCorrect ? "Proved" : "Reviewed") : "Waiting"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {retry.feedbackMd ? (
          <div className="text-sm">
            <MathMarkdown content={retry.feedbackMd} />
          </div>
        ) : null}
        {retry.sourceExcerpt ? (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide">
              From your note
            </p>
            <p className="break-words">{retry.sourceExcerpt.slice(0, 600)}</p>
          </div>
        ) : null}
        {showArt ? (
          <QuizArt answerId={answerId} concept={retry.concept} />
        ) : null}
        <div>
          <p className="mb-2 text-sm font-medium">
            <MathMarkdown content={retry.retryQuestion} />
          </p>
          <div className="space-y-2">
            {retry.retryOptions.map((option) => {
              const selected = activePick === option;
              const revealed = completed;
              const isKey = retry.retryCorrectAnswer === option;
              // After scoring the key reads default, a wrong pick reads
              // destructive, and everything else stays outline. Before
              // completion only the student's own pick is highlighted.
              const variant = revealed
                ? isKey
                  ? "default"
                  : selected
                    ? "destructive"
                    : "outline"
                : selected
                  ? "default"
                  : "outline";
              return (
                <Button
                  key={option}
                  variant={variant}
                  className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                  disabled={completed || submitMutation.isPending}
                  onClick={() => setPicked({ retryId: retry.id, option })}
                >
                  <span className="min-w-0 break-words text-left">
                    <MathMarkdown content={option} />
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
        {!completed ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!activePick || submitMutation.isPending}
              onClick={() => {
                if (activePick) submitMutation.mutate(activePick);
              }}
            >
              {submitMutation.isPending ? "Checking..." : "Submit retry"}
            </Button>
            {submitMutation.isError ? (
              <p className="text-sm text-destructive">
                Submit failed. Try again.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {retry.isCorrect
              ? "Nice. Your weak area now shows proof."
              : `The key was: ${retry.retryCorrectAnswer ?? ""}. Your weak area keeps this concept.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
