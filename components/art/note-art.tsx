"use client";

import { useId, useState } from "react";
import { ArtCard, ArtNotice, ArtSkeleton } from "@/components/art/art-card";
import { groupArtByPage } from "@/components/art/grouping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGenerateArt, useNoteArt } from "@/hooks/useArtifacts";

export function NoteArt({ noteId }: { noteId: string }) {
  const { data, isPending, isError, refetch } = useNoteArt(noteId);
  const generate = useGenerateArt();
  const [concept, setConcept] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const inputId = useId();

  const onDraw = () => {
    const clean = concept.trim().slice(0, 160);
    if (!clean || generate.isPending) return;
    setNotice(null);
    generate.mutate(
      { noteId, concept: clean },
      {
        onSuccess: () => {
          setConcept("");
          setLimited(false);
          void refetch();
        },
        onError: (e) => {
          if ((e as { code?: string }).code === "cap") {
            setLimited(true);
            setNotice("Daily draw limit reached for this idea.");
          } else setNotice(e.message);
        },
      },
    );
  };

  const scans = data?.scans ?? [];
  const drawn = data?.drawn ?? [];
  const { sections, unassigned, overflow } = groupArtByPage(scans, drawn);

  return (
    <section className="space-y-3">
      <span className="sr-only">Note figures</span>
      {isPending ? (
        <ArtSkeleton label="Loading note figures" />
      ) : isError ? (
        <ArtNotice
          message="Figures could not load."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {scans.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="sr-only">Page thumbnails</span>
              {scans.slice(0, 12).map((s) => (
                <a
                  key={`thumb-${s.pageNumber}`}
                  href={`#note-page-${s.pageNumber}`}
                  className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  p. {s.pageNumber}
                </a>
              ))}
            </div>
          ) : null}
          {sections.map((section) => (
            <div
              key={`page-${section.pageNumber}`}
              id={`note-page-${section.pageNumber}`}
              className="scroll-mt-24 space-y-2"
            >
              {section.scan ? (
                <ArtCard item={section.scan} caption={section.scan.altText} />
              ) : null}
              {section.drawn.map((d) => (
                <ArtCard key={d.id} item={d} caption={d.altText} />
              ))}
            </div>
          ))}
          {unassigned.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Other diagrams</p>
              {unassigned.map((d) => (
                <ArtCard key={d.id} item={d} caption={d.altText} />
              ))}
            </div>
          ) : null}
          {overflow > 0 ? (
            <p className="text-xs text-muted-foreground">
              Plus {overflow} more page{overflow === 1 ? "" : "s"} in your note.
            </p>
          ) : null}
        </>
      )}
      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center">
        <Label htmlFor={inputId} className="sr-only">
          Idea to draw
        </Label>
        <Input
          id={inputId}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Name one idea to draw, for example field lines"
          maxLength={160}
        />
        <Button
          type="button"
          size="sm"
          disabled={!concept.trim() || generate.isPending || limited}
          onClick={onDraw}
          className="shrink-0"
        >
          {generate.isPending ? "Drawing..." : "Draw it"}
        </Button>
      </div>
      {notice ? <ArtNotice message={notice} limit={limited} /> : null}
    </section>
  );
}
