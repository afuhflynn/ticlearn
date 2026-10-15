"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  onRemove?: () => void;
  filename?: string;
}

export function Attachment({ filename, onRemove, className, children, ...props }: AttachmentProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-md border border-input px-2 py-1 text-sm", className)} {...props}>
      <span>{filename ?? children}</span>
      {onRemove ? (
        <button type="button" aria-label="Remove attachment" onClick={onRemove}>
          x
        </button>
      ) : null}
    </div>
  );
}
