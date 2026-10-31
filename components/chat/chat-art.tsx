"use client";

import type { UIMessage } from "ai";
import { useMemo } from "react";
import { ArtCard, ArtNotice, ArtSkeleton } from "@/components/art/art-card";
import { useNoteArt } from "@/hooks/useArtifacts";

type DrawOutput = {
  ok?: boolean;
  id?: string;
  format?: "mermaid" | "svg";
  payload?: string;
  altText?: string;
};

function drawOutputsFromParts(parts: UIMessage["parts"]): DrawOutput[] {
  const out: DrawOutput[] = [];
  for (const part of parts ?? []) {
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      typeof (part as { type: unknown }).type === "string" &&
      (part as { type: string }).type.startsWith("tool-")
    ) {
      const tool = part as unknown as {
        toolName?: string;
        output?: unknown;
        state?: string;
      };
      if (tool.toolName !== "drawVisual") continue;
      const output = tool.output as DrawOutput | undefined;
      if (output?.ok && output.payload && output.format) out.push(output);
    }
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      (part as { type: string }).type === "dynamic-tool"
    ) {
      const tool = part as unknown as {
        toolName?: string;
        output?: unknown;
      };
      if (tool.toolName !== "drawVisual") continue;
      const output = tool.output as DrawOutput | undefined;
      if (output?.ok && output.payload && output.format) out.push(output);
    }
  }
  return out.slice(0, 2);
}

function citedPages(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(/[Pp]age\s+(\d{1,3})/g)) {
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

  if (draws.length === 0 && pages.length === 0) return null;
  if (!noteId && draws.length === 0) return null;

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
      {draws.map((d, i) => (
        <ArtCard
          key={d.id ?? `draw-${i}`}
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
      ))}
    </div>
  );
}
