"use client";

import type { UIMessage } from "ai";
import { useMemo, useState } from "react";
import { ArtCard, ArtNotice, ArtSkeleton } from "@/components/art/art-card";
import { useGenerateArt, useNoteArt } from "@/hooks/useArtifacts";

type DrawOutput = {
  ok?: boolean;
  reason?: string;
  message?: string;
  id?: string;
  format?: "mermaid" | "svg";
  payload?: string;
  altText?: string;
};

type DrawPart = {
  toolCallId?: string;
  toolName?: string;
  input?: { concept?: string };
  output?: unknown;
  state?: string;
};

/** Static parts carry the tool name in the type (`tool-drawVisual`);
 *  only dynamic parts carry a separate toolName field. */
function drawNameOf(part: { type: string }, tool?: DrawPart): string | null {
  if (part.type === "dynamic-tool") return tool?.toolName ?? null;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return null;
}

function drawOutputsFromParts(
  parts: UIMessage["parts"],
): { part: DrawPart; output: DrawOutput }[] {
  const out: { part: DrawPart; output: DrawOutput }[] = [];
  for (const part of parts ?? []) {
    if (typeof part !== "object" || part === null || !("type" in part)) {
      continue;
    }
    const typed = part as { type: unknown };
    if (typeof typed.type !== "string") continue;
    if (typed.type !== "dynamic-tool" && !typed.type.startsWith("tool-")) {
      continue;
    }
    const tool = part as DrawPart & { toolName?: string };
    if (drawNameOf({ type: typed.type }, tool) !== "drawVisual") continue;
    const output = tool.output as DrawOutput | undefined;
    if (output && typeof output.ok === "boolean") {
      out.push({ part: tool, output });
    }
  }
  return out.slice(0, 2);
}

function citedPages(text: string): number[] {
  const found = new Set<number>();
  // The chat prompt cites pages as (p. 3), so accept page, p., and pp.
  for (const m of text.matchAll(
    /(?:^|[\s(])(?:p{1,2}\.?|pages?)\s+(\d{1,3})/gi,
  )) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 999) found.add(n);
  }
  return [...found].slice(0, 6);
}

export function ChatArt({
  message,
  text,
  noteId,
}: {
  message: UIMessage;
  text: string;
  noteId?: string | null;
}) {
  const draws = useMemo(
    () => drawOutputsFromParts(message.parts),
    [message.parts],
  );
  // A retried draw lands here, beside the history, since message parts
  // are immutable once the turn is stored.
  const [redrawn, setRedrawn] = useState<DrawOutput[]>([]);
  const [redrawError, setRedrawError] = useState<string | null>(null);
  const [redrawingKey, setRedrawingKey] = useState<string | null>(null);
  const generate = useGenerateArt();

  const onRetryDraw = (key: string, concept: string) => {
    setRedrawingKey(key);
    setRedrawError(null);
    generate.mutate(
      { noteId: noteId ?? undefined, concept },
      {
        onSuccess: (data) => {
          setRedrawn((prev) => [
            ...prev,
            {
              ok: true,
              id: data.id,
              format: data.format,
              payload: data.payload,
              altText: data.altText,
            },
          ]);
          setRedrawingKey(null);
        },
        onError: (e) => {
          setRedrawError(e.message);
          setRedrawingKey(null);
        },
      },
    );
  };
  const pages = useMemo(() => citedPages(text), [text]);
  const { data, isPending, isError, refetch } = useNoteArt(
    noteId && pages.length > 0 ? noteId : null,
  );

  const scans = useMemo(() => {
    if (!data?.scans || pages.length === 0) return [];
    const byPage = new Map(data.scans.map((s) => [s.pageNumber, s]));
    return pages
      .map((p) => byPage.get(p))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .slice(0, 3);
  }, [data, pages]);

  if (draws.length === 0 && pages.length === 0 && redrawn.length === 0) {
    return null;
  }
  if (!noteId && draws.length === 0 && redrawn.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2 py-1">
      <span className="sr-only">Figures</span>
      {noteId && pages.length > 0 ? (
        isPending ? (
          <ArtSkeleton label="Loading page figure" />
        ) : isError ? (
          <ArtNotice
            message="The page figure could not load."
            onRetry={() => refetch()}
          />
        ) : (
          scans.map((scan) => (
            <ArtCard
              key={`scan-${scan.pageNumber}`}
              item={scan}
              caption={scan.altText}
            />
          ))
        )
      ) : null}
      {draws.map(({ part, output: d }, i) => {
        const key = d.id ?? `draw-${i}`;
        if (d.ok && d.payload && d.format) {
          return (
            <ArtCard
              key={key}
              item={{
                kind: "drawn",
                id: d.id ?? `draw-${i}`,
                format: d.format as "mermaid" | "svg",
                payload: d.payload as string,
                altText: d.altText ?? "Diagram drawn for this answer",
                sourcePage: null,
                createdAt: new Date().toISOString(),
              }}
              caption={d.altText ?? "Fresh diagram for this idea"}
            />
          );
        }
        if (d.reason === "cap") {
          return (
            <ArtNotice
              key={key}
              message={d.message ?? "Daily draw limit reached for this idea."}
              limit
            />
          );
        }
        const concept = part.input?.concept?.trim().slice(0, 160);
        return (
          <ArtNotice
            key={key}
            message={d.message ?? "The drawing could not load."}
            onRetry={
              concept && redrawingKey !== key
                ? () => onRetryDraw(key, concept)
                : undefined
            }
          />
        );
      })}
      {redrawn.map((d, i) =>
        d.payload && d.format ? (
          <ArtCard
            key={d.id ?? `redraw-${i}`}
            item={{
              kind: "drawn",
              id: d.id ?? `redraw-${i}`,
              format: d.format as "mermaid" | "svg",
              payload: d.payload as string,
              altText: d.altText ?? "Diagram drawn for this answer",
              sourcePage: null,
              createdAt: new Date().toISOString(),
            }}
            caption={d.altText ?? "Fresh diagram for this idea"}
          />
        ) : null,
      )}
      {redrawError ? <ArtNotice message={redrawError} /> : null}
    </div>
  );
}
