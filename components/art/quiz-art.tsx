"use client";

import { useState } from "react";
import { ArtCard, ArtNotice, ArtSkeleton } from "@/components/art/art-card";
import { orderScansByPages } from "@/components/art/grouping";
import { Button } from "@/components/ui/button";
import { useAnswerArt, useGenerateArt, useNoteArt } from "@/hooks/useArtifacts";

export function QuizArt({
  noteId,
  sourcePages,
  answerId,
  concept,
}: {
  noteId?: string | null;
  sourcePages?: number[];
  answerId?: string | null;
  concept?: string | null;
}) {
  const pages = (sourcePages ?? []).slice(0, 3);
  const noteQuery = useNoteArt(noteId && pages.length > 0 ? noteId : null);
  const answerQuery = useAnswerArt(answerId ?? null);
  const generate = useGenerateArt();
  const [drawError, setDrawError] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);

  const scans = orderScansByPages(noteQuery.data?.scans ?? [], pages);
  const overflow =
    (sourcePages ?? []).length > scans.length
      ? (sourcePages ?? []).length - scans.length
      : 0;
  const retryArt = answerQuery.data?.drawn ?? [];

  if (!noteId && !answerId) return null;
  if (pages.length === 0 && !answerId) return null;

  const onDraw = () => {
    if (!concept) return;
    setDrawError(null);
    generate.mutate(
      { answerId: answerId ?? undefined, concept },
      {
        onSuccess: () => {
          void answerQuery.refetch();
          setLimited(false);
        },
        onError: (e) => {
          if ((e as { code?: string }).code === "cap") setLimited(true);
          else setDrawError(e.message);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <span className="sr-only">Question figures</span>
      {noteQuery.isPending && pages.length > 0 ? (
        <ArtSkeleton label="Loading page figure" />
      ) : noteQuery.isError && pages.length > 0 ? (
        <ArtNotice
          message="The page figure could not load."
          onRetry={() => noteQuery.refetch()}
        />
      ) : (
        scans.map((scan) => (
          <ArtCard
            key={`quiz-scan-${scan.pageNumber}`}
            item={scan}
            caption={scan.altText}
          />
        ))
      )}
      {overflow > 0 ? (
        <p className="text-xs text-muted-foreground">
          Plus {overflow} more page{overflow === 1 ? "" : "s"} in your note.
        </p>
      ) : null}
      {answerQuery.isError ? (
        <ArtNotice
          message="Saved drawings could not load."
          onRetry={() => answerQuery.refetch()}
        />
      ) : null}
      {answerQuery.data
        ? retryArt.map((d) => (
            <ArtCard
              key={d.id}
              item={d}
              caption={d.altText}
              onRetry={!limited && concept ? onDraw : undefined}
              retryLabel="Draw again"
            />
          ))
        : null}
      {limited && retryArt.length > 0 ? (
        <ArtNotice
          message="Daily draw limit reached for this idea."
          limit
        />
      ) : null}
      {concept &&
      answerId &&
      retryArt.length === 0 &&
      !answerQuery.isPending ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={generate.isPending || limited}
            onClick={onDraw}
          >
            {generate.isPending ? "Drawing..." : "Draw it for me"}
          </Button>
          {limited ? (
            <span className="text-xs text-muted-foreground">
              Daily draw limit reached for this idea.
            </span>
          ) : null}
        </div>
      ) : null}
      {drawError ? <ArtNotice message={drawError} /> : null}
    </div>
  );
}
