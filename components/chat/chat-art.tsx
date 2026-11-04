"use client";

import type { UIMessage } from "ai";
import { useMemo, useRef, useState } from "react";
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
  caption?: string;
  textSteps?: string[];
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
    const name = drawNameOf({ type: typed.type }, tool);
    if (name !== "drawVisual" && name !== "drawDiagram") continue;
    const output = tool.output as DrawOutput | undefined;
    if (output && typeof output.ok === "boolean") {
      out.push({ part: tool, output });
    }
  }
  return out.slice(0, 2);
}

function drawBuildingFromParts(parts: UIMessage["parts"]): number {
  let count = 0;
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
    const name = drawNameOf({ type: typed.type }, tool);
    if (name !== "drawVisual" && name !== "drawDiagram") continue;
    const output = tool.output as DrawOutput | undefined;
    const state = (tool as { state?: string }).state;
    if (!output || typeof output.ok !== "boolean") {
      if (!state || state !== "output-error") count += 1;
    }
  }
  return Math.min(count, 2);
}

function StepsList({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      {steps.map((s, n) => (
        <li key={n}>{s}</li>
      ))}
    </ol>
  );
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
  const threadId =
    typeof message.id === "string" && message.id.length > 0
      ? message.id
      : "thread";
  const [retryTaps, setRetryTaps] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.sessionStorage.getItem(
        `ticlearn:draw:retries:${threadId}`,
      );
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      if (!parsed || typeof parsed !== "object") return {};
      const clean: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const count = Number(value);
        if (key && Number.isFinite(count) && count > 0) clean[key] = count;
      }
      return clean;
    } catch {
      return {};
    }
  });
  const lastRetryAt = useRef<Record<string, number>>({});
  const generate = useGenerateArt();

  const onRetryDraw = (key: string, concept: string) => {
    const now = Date.now();
    if (now - (lastRetryAt.current[key] ?? 0) < 1000) return;
    lastRetryAt.current[key] = now;
    const taps = (retryTaps[key] ?? 0) + 1;
    const next = { ...retryTaps, [key]: taps };
    setRetryTaps(next);
    try {
      window.sessionStorage.setItem(
        `ticlearn:draw:retries:${threadId}`,
        JSON.stringify(next),
      );
    } catch {
      return;
    }
    if (taps > 2) return;
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
              caption: data.caption,
              textSteps: data.textSteps,
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

  const building = useMemo(
    () => drawBuildingFromParts(message.parts),
    [message.parts],
  );

  if (
    draws.length === 0 &&
    pages.length === 0 &&
    redrawn.length === 0 &&
    building === 0
  ) {
    return null;
  }
  if (!noteId && draws.length === 0 && redrawn.length === 0 && building === 0)
    return null;

  return (
    <div className="flex w-full flex-col gap-2 py-1">
      <span className="sr-only">Figures</span>
      {building > 0
        ? Array.from({ length: building }).map((_, n) => (
            <div
              key={`building-${n}`}
              className="grid w-full gap-2 md:grid-cols-2 md:items-start"
            >
              <ArtSkeleton label="Drawing your diagram" />
              <p className="text-sm text-muted-foreground">
                Drawing your diagram, teaching steps follow.
              </p>
            </div>
          ))
        : null}
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
        const steps = Array.isArray(d.textSteps) ? d.textSteps.slice(0, 3) : [];
        const caption =
          typeof d.caption === "string" && d.caption.trim().length > 0
            ? d.caption.trim().slice(0, 140)
            : (d.altText ?? "Fresh diagram for this idea");
        const taps = retryTaps[key] ?? 0;
        if (d.ok && d.payload && d.format) {
          return (
            <div
              key={key}
              className="grid w-full gap-2 md:grid-cols-2 md:items-start"
            >
              <ArtCard
                item={{
                  kind: "drawn",
                  id: d.id ?? `draw-${i}`,
                  format: d.format as "mermaid" | "svg",
                  payload: d.payload as string,
                  altText: d.altText ?? "Diagram drawn for this answer",
                  sourcePage: null,
                  createdAt: new Date().toISOString(),
                }}
                caption={caption}
              />
              <StepsList steps={steps} />
            </div>
          );
        }
        if (d.reason === "cap") {
          return (
            <div key={key} className="flex w-full flex-col gap-2">
              <ArtNotice
                message={d.message ?? "Daily draw limit reached for this idea."}
                limit
              />
              <StepsList steps={steps} />
            </div>
          );
        }
        const concept = part.input?.concept?.trim().slice(0, 160);
        const isRetrying = redrawingKey === key;
        return (
          <div key={key} className="flex w-full flex-col gap-2">
            {isRetrying ? (
              <ArtSkeleton label="Drawing your diagram" />
            ) : (
              <ArtNotice
                message="Could not draw that. Steps below still teach it."
                onRetry={
                  concept && taps < 2
                    ? () => onRetryDraw(key, concept)
                    : undefined
                }
              />
            )}
            <StepsList steps={steps} />
          </div>
        );
      })}
      {redrawn.map((d, i) => {
        if (!d.payload || !d.format) {
          return (
            <div
              key={d.id ?? `redraw-${i}`}
              className="flex w-full flex-col gap-2"
            >
              <ArtNotice message="Could not draw that. Steps below still teach it." />
              <StepsList
                steps={
                  Array.isArray(d.textSteps) ? d.textSteps.slice(0, 3) : []
                }
              />
            </div>
          );
        }
        const caption =
          typeof d.caption === "string" && d.caption.trim().length > 0
            ? d.caption.trim().slice(0, 140)
            : (d.altText ?? "Fresh diagram for this idea");
        return (
          <div
            key={d.id ?? `redraw-${i}`}
            className="grid w-full gap-2 md:grid-cols-2 md:items-start"
          >
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
              caption={caption}
            />
            <StepsList
              steps={Array.isArray(d.textSteps) ? d.textSteps.slice(0, 3) : []}
            />
          </div>
        );
      })}
      {redrawError ? <ArtNotice message={redrawError} /> : null}
    </div>
  );
}
