"use client";

import { UploadCloud } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FileDropProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  title?: string;
  description?: string;
  hint?: string;
  actionLabel?: string;
}

/**
 * The one file picker in the app. It owns the drag state so the drop area can
 * answer while a file is over it, and it keeps the picker a real button for
 * keyboard and screen reader users.
 */
export function FileDrop({
  accept,
  multiple,
  disabled = false,
  onFiles,
  className,
  title = "Choose a file or drag it here",
  description,
  hint,
  actionLabel = "Choose file",
}: FileDropProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;
    onFiles(Array.from(fileList));
  }

  return (
    <fieldset
      aria-label={title}
      className={cn(
        "m-0 flex min-w-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input px-6 py-10 text-center transition-colors",
        isDragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <UploadCloud className="size-5 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {actionLabel}
      </Button>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </fieldset>
  );
}
