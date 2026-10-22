// biome-ignore-all lint/a11y/useSemanticElements: File drop is a layout region and keeps a div API for drag events.

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FileDropProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
}

export function FileDrop({
  accept,
  multiple,
  onFiles,
  className,
}: FileDropProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      role="group"
      aria-label="File upload"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-6 text-center",
        className,
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
    >
      <button type="button" onClick={() => inputRef.current?.click()}>
        Choose files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
