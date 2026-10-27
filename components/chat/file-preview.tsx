"use client";

import { ImageOffIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { chatFileMetaFor } from "@/lib/chat/file-meta";
import { cn, formatFileSize } from "@/lib/utils";

export type PreviewableFile = {
  url: string;
  filename?: string;
  mediaType: string;
  size?: number;
  textContent?: string;
};

export function isImageFile(mediaType: string): boolean {
  return mediaType.startsWith("image/");
}

/**
 * An attachment that previews on tap. Images open a lightbox with zoom,
 * documents open a sheet. Nothing opens a new tab. A chip is the small 64
 * pixel square; a message draws a sent image at the sending size.
 */
export function FilePreview({
  file,
  className,
  variant = "chip",
}: {
  file: PreviewableFile;
  className?: string;
  variant?: "chip" | "message";
}) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [docBroken, setDocBroken] = useState(false);
  const [zoom, setZoom] = useState(1);
  const name = file.filename || "Attachment";
  const isImage = isImageFile(file.mediaType);
  const isMessage = variant === "message";
  const meta = chatFileMetaFor(file.mediaType);

  useEffect(() => {
    if (!open || isImage || file.textContent) return;
    let alive = true;
    fetch(file.url, { method: "HEAD" })
      .then((response) => {
        if (alive && !response.ok) setDocBroken(true);
      })
      .catch(() => {
        // A blocked HEAD is not proof the file is gone, so keep the preview.
      });
    return () => {
      alive = false;
    };
  }, [file.textContent, file.url, isImage, open]);

  if (broken) {
    return (
      <span
        className={cn(
          "flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] bg-muted text-center text-[0.65rem] text-muted-foreground",
          className,
        )}
      >
        <ImageOffIcon className="size-4" />
        Preview unavailable
      </span>
    );
  }

  const imageTile = "size-16 rounded-[var(--radius-md)]";
  const messageImageTile = "size-40 rounded-xl";

  return (
    <>
      <Button
        className={cn(
          "shrink-0 overflow-hidden p-0 text-muted-foreground",
          isImage
            ? isMessage
              ? messageImageTile
              : imageTile
            : "size-16 rounded-[var(--radius-md)]",
          className,
        )}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <span className="sr-only">Preview {name}</span>
        {isImage && file.url ? (
          // biome-ignore lint/performance/noImgElement: chat files come from arbitrary Blob and legacy origins that next/image cannot preconfigure.
          <img
            alt=""
            className="size-full object-cover"
            height={isMessage ? 160 : 64}
            onError={() => setBroken(true)}
            src={file.url}
            width={isMessage ? 160 : 64}
          />
        ) : (
          <span
            className={cn(
              "flex size-full items-center justify-center bg-inherit",
              meta.tile,
            )}
          >
            <meta.Icon className="size-6" />
          </span>
        )}
      </Button>

      {isImage ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl gap-3 p-3">
            <DialogTitle className="truncate pr-8 text-sm">{name}</DialogTitle>
            <DialogDescription className="sr-only">
              Image preview
            </DialogDescription>
            <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-[var(--radius-md)] bg-muted/40">
              {/* biome-ignore lint/performance/noImgElement: chat files come from arbitrary Blob and legacy origins that next/image cannot preconfigure. */}
              <img
                alt={name}
                className="origin-center object-contain transition-transform duration-200 motion-reduce:transition-none"
                src={file.url}
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => setZoom((current) => Math.max(1, current - 0.5))}
                size="icon-lg"
                type="button"
                variant="outline"
              >
                <ZoomOutIcon />
                <span className="sr-only">Zoom out</span>
              </Button>
              <span className="min-w-12 text-center text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                onClick={() => setZoom((current) => Math.min(3, current + 0.5))}
                size="icon-lg"
                type="button"
                variant="outline"
              >
                <ZoomInIcon />
                <span className="sr-only">Zoom in</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] gap-2">
            <SheetHeader>
              <SheetTitle className="truncate pr-8 text-sm">{name}</SheetTitle>
              <SheetDescription className="text-xs">
                {file.mediaType}
                {typeof file.size === "number"
                  ? ` · ${formatFileSize(file.size)}`
                  : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              {docBroken ? (
                <p className="rounded-[var(--radius-md)] border bg-muted/40 p-3 text-sm text-muted-foreground">
                  This file is no longer available. It was removed from storage
                  after it was sent.
                </p>
              ) : file.textContent ? (
                <pre className="whitespace-pre-wrap break-words text-sm">
                  {file.textContent}
                </pre>
              ) : file.mediaType === "application/pdf" ? (
                <iframe
                  className="h-full min-h-[60vh] w-full rounded-[var(--radius-md)] border"
                  src={file.url}
                  title={name}
                />
              ) : (
                <p className="rounded-[var(--radius-md)] border bg-muted/40 p-3 text-sm text-muted-foreground">
                  This document type cannot be drawn inside the page. Its name
                  and size are above, and it is attached to the message.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
