"use client";

import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LiveRegion } from "@/components/ui/live-region";
import type { ArtItem } from "@/hooks/useArtifacts";
import { cn } from "@/lib/utils";

const SVG_RENDER_MAX_BYTES = 200_000;

/** Client side scrub before render. The server already stores DOMPurify
 *  svg profile output; this second pass covers anything that changed. */
function sanitizeSvgForRender(raw: string): string {
  if (!raw || raw.length > SVG_RENDER_MAX_BYTES) return "";
  if (!raw.toLowerCase().includes("<svg")) return "";
  return DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } });
}

function DrawnFigure({
  item,
  idSuffix,
}: {
  item: Extract<ArtItem, { kind: "drawn" }>;
  idSuffix?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (item.format !== "mermaid" || !hostRef.current) return;
    let alive = true;
    setRendered(false);
    setFailed(false);
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          // Plain text labels only: HTML labels render through foreignObject,
          // which the sanitizer strips, so rendered diagrams would lose text.
          // The top level flag is the canonical one; several shapes ignore
          // the deprecated flowchart scoped flag.
          htmlLabels: false,
        });
        if (!alive || !hostRef.current) return;
        const renderId =
          `art-${item.id}${idSuffix ? `-${idSuffix}` : ""}`.replace(
            /[^a-zA-Z0-9-_]/g,
            "-",
          );
        const { svg } = await mermaid.render(renderId, item.payload);
        if (!alive || !hostRef.current) return;
        // Sanitized after render per spec; the svg string never lands raw.
        hostRef.current.innerHTML = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true },
        });
        setRendered(true);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [item.payload, item.format, item.id]);

  if (item.format === "svg") {
    const clean = sanitizeSvgForRender(item.payload);
    if (!clean) return null;
    return (
      <div className="w-full overflow-hidden rounded-md bg-card">
        <span className="sr-only">{item.altText}</span>
        <div
          className="mermaid-svg-host"
          // Sanitized on the server before store and again here before render.
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      </div>
    );
  }
  if (failed) {
    return (
      <p className="px-1 py-2 text-sm text-muted-foreground">
        The diagram could not render. {item.altText}
      </p>
    );
  }
  return (
    <span className="block aspect-[4/3] w-full overflow-hidden bg-card">
      <div className="h-full w-full overflow-x-auto p-2 text-sm">
        <span className="sr-only">{item.altText}</span>
        {!rendered ? <span className="sr-only">Loading diagram</span> : null}
        <div ref={hostRef} className="mermaid-host h-full w-full" />
      </div>
    </span>
  );
}

export function ArtSkeleton({ label = "Loading figure" }: { label?: string }) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-muted">
      <div className="aspect-[4/3] w-full animate-pulse bg-muted-foreground/10" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ZoomedArt({ item }: { item: ArtItem }) {
  if (item.kind === "scan") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt={item.altText}
        className="max-h-[80vh] w-full object-contain"
      />
    );
  }
  if (item.format === "svg") {
    return (
      <div>
        <span className="sr-only">{item.altText}</span>
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeSvgForRender(item.payload),
          }}
        />
      </div>
    );
  }
  if (item.format === "mermaid") {
    // The zoom dialog renders the diagram, not the raw source, with its
    // own render id so it never collides with the inline figure.
    return <DrawnFigure item={item} idSuffix="zoom" />;
  }
  return <pre className="whitespace-pre-wrap text-sm">{item.payload}</pre>;
}

export function ArtCard({
  item,
  caption,
  onRetry,
  retryLabel = "Try the drawing again",
  className,
}: {
  item: ArtItem;
  caption?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const [zoom, setZoom] = useState(false);
  const isScan = item.kind === "scan";
  const pageTag = isScan ? `Page ${item.pageNumber}` : null;
  const zoomTitle = isScan ? "Page figure enlarged" : "Diagram enlarged";

  return (
    <figure
      className={cn(
        "w-full overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogTrigger asChild>
          <span className="block w-full cursor-zoom-in">
            <span className="sr-only">
              {isScan
                ? `Enlarge page ${item.pageNumber} figure`
                : "Enlarge diagram"}
            </span>
            {isScan ? (
              // Scans stay raster art from the framed PDF path.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.altText}
                loading="lazy"
                className="aspect-[4/3] w-full bg-muted object-contain"
              />
            ) : (
              <DrawnFigure item={item} />
            )}
          </span>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{zoomTitle}</DialogTitle>
          <div className="max-h-[80vh] overflow-auto">
            <ZoomedArt item={item} />
          </div>
        </DialogContent>
      </Dialog>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">
          {pageTag ? `${pageTag} · ` : ""}
          {caption ?? item.altText}
        </span>
        {onRetry ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-7 shrink-0 px-2"
          >
            {retryLabel}
          </Button>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function ArtNotice({
  message,
  onRetry,
  limit = false,
}: {
  message: string;
  onRetry?: () => void;
  limit?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm">
      <LiveRegion>{message}</LiveRegion>
      <span className="text-muted-foreground">{message}</span>
      {onRetry && !limit ? (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
