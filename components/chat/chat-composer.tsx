"use client";

import { upload } from "@vercel/blob/client";
import type { FileUIPart } from "ai";
import {
  PaperclipIcon,
  PlusIcon,
  RotateCwIcon,
  SendIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CHAT_CAPABILITY_LINE, TIP_NAME } from "@/components/chat/constants";
import { FilePreview } from "@/components/chat/file-preview";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn, formatFileSize } from "@/lib/utils";

/** Pastes longer than this become a text attachment instead of a wall of text. */
export const LONG_PASTE_THRESHOLD = 6000;

/** Every attachment input maps to one of these ceilings. */
const MB = 1024 * 1024;
const LIMITS = {
  image: 8 * MB,
  document: 16 * MB,
  text: 4 * MB,
} as const;

const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

export const CHAT_ACCEPT =
  "image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json";

const ACCEPTED_PREFIXES = ["image/"];

function isAcceptedType(mediaType: string): boolean {
  if (ACCEPTED_PREFIXES.some((prefix) => mediaType.startsWith(prefix))) {
    return true;
  }
  return (
    mediaType === "application/pdf" ||
    mediaType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    TEXT_TYPES.has(mediaType)
  );
}

function ceilingFor(mediaType: string): number {
  if (mediaType.startsWith("image/")) return LIMITS.image;
  if (TEXT_TYPES.has(mediaType)) return LIMITS.text;
  return LIMITS.document;
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, "-").slice(-80) || "file";
}

function textAsDataUrl(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:text/plain;base64,${btoa(binary)}`;
}

type ComposerAttachment = {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  url?: string;
  file?: File;
  progress: number;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
  textContent?: string;
  source: "file" | "paste";
};

export type ChatComposerSubmission = {
  text: string;
  files: FileUIPart[];
  /** The full paste when it travelled as a text file, so it can be restored. */
  textAttachment?: string;
};

export type ChatComposerPrefill = {
  text: string;
  /** Changes on every request, so two identical prefills still land. */
  nonce: number;
};

export type ChatComposerRestore = {
  text: string;
  notice: string;
  nonce: number;
};

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

export function ChatComposer({
  disabled,
  disabledReason,
  draftKey,
  initialText,
  onSubmit,
  onStop,
  prefill,
  replaceWarning,
  onCancelReplace,
  restore,
  status,
  className,
}: {
  disabled?: boolean;
  disabledReason?: string;
  draftKey: string;
  initialText?: string;
  onSubmit: (message: ChatComposerSubmission) => void | Promise<void>;
  onStop?: () => void;
  prefill?: ChatComposerPrefill;
  replaceWarning?: boolean;
  onCancelReplace?: () => void;
  restore?: ChatComposerRestore;
  status: ChatStatus;
  className?: string;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState(initialText ?? "");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const draftStorageKey = `ticlearn-chat-draft:${draftKey}`;
  const draftBeforeReplace = useRef<string | null>(null);
  const wasReplacing = useRef(false);
  const sentWhileReplacing = useRef(false);

  const streaming = status === "submitted" || status === "streaming";

  // Restore a draft once, from the tab's own storage.
  useEffect(() => {
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    try {
      const stored = window.sessionStorage.getItem(draftStorageKey);
      if (stored) setText(stored);
    } catch {
      // A private window may refuse storage. The composer still works.
    }
  }, [draftStorageKey]);

  useEffect(() => {
    try {
      if (text) window.sessionStorage.setItem(draftStorageKey, text);
      else window.sessionStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore an unavailable session storage.
    }
  }, [draftStorageKey, text]);

  // A starter card, an edit, or Make a quiz from this.
  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        prefill.text.length,
        prefill.text.length,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [prefill]);

  useEffect(() => {
    if (!restore) return;
    setText(restore.text);
    setNotice(restore.notice);
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [restore]);

  // Hold the draft an edit replaced, then give it back if the edit is cancelled.
  useEffect(() => {
    if (replaceWarning && !wasReplacing.current) {
      draftBeforeReplace.current = text;
      sentWhileReplacing.current = false;
    }
    if (
      !replaceWarning &&
      wasReplacing.current &&
      !sentWhileReplacing.current &&
      draftBeforeReplace.current !== null
    ) {
      setText(draftBeforeReplace.current);
      draftBeforeReplace.current = null;
    }
    wasReplacing.current = Boolean(replaceWarning);
  }, [replaceWarning, text]);

  const updateAttachment = useCallback(
    (id: string, patch: Partial<ComposerAttachment>) => {
      setAttachments((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const startUpload = useCallback(
    async (item: ComposerAttachment) => {
      if (!item.file) return;
      if (!userId) {
        updateAttachment(item.id, {
          status: "failed",
          error: "Sign in again to attach files.",
        });
        return;
      }

      updateAttachment(item.id, {
        status: "uploading",
        progress: 0,
        error: undefined,
      });
      try {
        const result = await upload(
          `chat/${userId}/${crypto.randomUUID()}-${safeFileName(item.name)}`,
          item.file,
          {
            access: "public",
            clientPayload: JSON.stringify({
              mediaType: item.mediaType,
              size: item.size,
            }),
            handleUploadUrl: "/api/chat/upload",
            onUploadProgress: ({ percentage }) => {
              updateAttachment(item.id, {
                progress: Math.round(percentage),
              });
            },
          },
        );
        updateAttachment(item.id, {
          status: "uploaded",
          progress: 100,
          url: result.url,
        });
      } catch {
        updateAttachment(item.id, {
          status: "failed",
          error: "Upload failed. Check your connection and try again.",
        });
      }
    },
    [updateAttachment, userId],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      const accepted: ComposerAttachment[] = [];

      for (const file of files) {
        if (!isAcceptedType(file.type)) {
          setNotice("Only images, PDF, DOCX and text files can be attached.");
          continue;
        }
        const ceiling = ceilingFor(file.type);
        if (file.size > ceiling) {
          setNotice(
            `${file.name} is ${formatFileSize(file.size)}. The limit for this type is ${formatFileSize(ceiling)}.`,
          );
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name || "Attachment",
          mediaType: file.type,
          size: file.size,
          file,
          progress: 0,
          status: "uploading",
          source: "file",
        });
      }

      if (accepted.length === 0) return;
      setAttachments((current) => [...current, ...accepted]);
      for (const item of accepted) void startUpload(item);
    },
    [startUpload],
  );

  const addPasteAttachment = useCallback((pasted: string) => {
    setAttachments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "pasted-text.txt",
        mediaType: "text/plain",
        size: new TextEncoder().encode(pasted).length,
        url: textAsDataUrl(pasted),
        progress: 100,
        status: "uploaded",
        textContent: pasted,
        source: "paste",
      },
    ]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const showPasteInTextField = useCallback((item: ComposerAttachment) => {
    setText((current) => `${current}${item.textContent ?? ""}`);
    setAttachments((current) =>
      current.filter((entry) => entry.id !== item.id),
    );
  }, []);

  const retryAttachment = useCallback(
    (item: ComposerAttachment) => {
      if (item.source === "paste") return;
      void startUpload(item);
    },
    [startUpload],
  );

  const uploading = attachments.some((item) => item.status === "uploading");
  const failed = attachments.some((item) => item.status === "failed");
  const canSend =
    !disabled &&
    !uploading &&
    !failed &&
    (text.trim().length > 0 || attachments.length > 0);

  const handleSubmit = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (streaming) {
        onStop?.();
        return;
      }
      if (!canSend) return;

      const files: FileUIPart[] = attachments
        .filter((item) => item.status === "uploaded" && item.url)
        .map((item) => ({
          type: "file",
          mediaType: item.mediaType,
          filename: item.name,
          url: item.url as string,
        }));
      const paste = attachments.find((item) => item.source === "paste");

      if (replaceWarning) sentWhileReplacing.current = true;

      await onSubmit({
        text: text.trim(),
        files,
        textAttachment: paste?.textContent,
      });

      setText("");
      setAttachments([]);
      setNotice(null);
      try {
        window.sessionStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore an unavailable session storage.
      }
    },
    [
      attachments,
      canSend,
      draftStorageKey,
      onStop,
      onSubmit,
      replaceWarning,
      streaming,
      text,
    ],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (event.nativeEvent.isComposing) return;
      if (coarsePointer) return;
      event.preventDefault();
      void handleSubmit();
    },
    [coarsePointer, handleSubmit],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardFiles = Array.from(event.clipboardData.files ?? []);
      if (clipboardFiles.length > 0) {
        event.preventDefault();
        addFiles(clipboardFiles);
        return;
      }

      const pasted = event.clipboardData.getData("text");
      if (!pasted) return;
      if (text.length + pasted.length <= LONG_PASTE_THRESHOLD) return;

      event.preventDefault();
      addPasteAttachment(pasted);
      setNotice(
        `That paste was ${pasted.length.toLocaleString("en-US")} characters, so it is attached as a text file.`,
      );
    },
    [addFiles, addPasteAttachment, text.length],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(event.target.files);
      event.target.value = "";
    },
    [addFiles],
  );

  const visibleAttachments = showAllAttachments
    ? attachments
    : attachments.slice(0, 3);
  const hiddenCount = attachments.length - visibleAttachments.length;
  const characterCount = text.length;
  const placeholder = disabled
    ? (disabledReason ?? "Chat is unavailable right now.")
    : `Ask ${TIP_NAME} anything, or drop a photo or PDF.`;

  return (
    <div className={cn("w-full", className)}>
      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-start gap-2">
          {visibleAttachments.map((item) => (
            <div
              className="flex max-w-full items-center gap-2 rounded-[var(--radius-md)] border bg-muted/30 p-1.5"
              key={item.id}
            >
              {item.url ? (
                <FilePreview
                  file={{
                    url: item.url,
                    filename: item.name,
                    mediaType: item.mediaType,
                    size: item.size,
                    textContent: item.textContent,
                  }}
                />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-md)] border bg-muted text-muted-foreground">
                  <PaperclipIcon aria-hidden="true" className="size-5" />
                </span>
              )}
              <div className="min-w-0 max-w-40">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.size)}
                  {item.status === "uploading"
                    ? ` · ${item.progress}%`
                    : item.status === "failed"
                      ? " · failed"
                      : ""}
                </p>
                {item.error ? (
                  <p className="text-xs text-destructive">{item.error}</p>
                ) : null}
                {item.source === "paste" ? (
                  <button
                    className="mt-1 text-left text-xs underline underline-offset-2"
                    onClick={() => showPasteInTextField(item)}
                    type="button"
                  >
                    Show in text field
                  </button>
                ) : null}
              </div>
              {item.status === "failed" && item.source === "file" ? (
                <Button
                  aria-label={`Retry ${item.name}`}
                  className="size-11 shrink-0"
                  onClick={() => retryAttachment(item)}
                  type="button"
                  variant="ghost"
                >
                  <RotateCwIcon aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
              <Button
                aria-label={`Remove ${item.name}`}
                className="size-11 shrink-0"
                onClick={() => removeAttachment(item.id)}
                type="button"
                variant="ghost"
              >
                <XIcon aria-hidden="true" className="size-4" />
              </Button>
            </div>
          ))}
          {hiddenCount > 0 ? (
            <button
              className="flex h-16 min-w-11 items-center justify-center rounded-[var(--radius-md)] border bg-muted/30 px-3 text-xs font-medium"
              onClick={() => setShowAllAttachments(true)}
              type="button"
            >
              +{hiddenCount}
            </button>
          ) : null}
        </div>
      ) : null}

      {replaceWarning ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-dashed px-3 py-2 text-xs">
          <span>Everything after this message will be replaced.</span>
          <Button
            className="min-h-11"
            onClick={() => {
              sentWhileReplacing.current = false;
              onCancelReplace?.();
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel edit
          </Button>
        </div>
      ) : null}

      {notice ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {notice}
          {characterCount > 0
            ? ` ${characterCount.toLocaleString("en-US")} characters in the box.`
            : ""}
        </p>
      ) : null}

      <form
        className="rounded-[var(--radius)] border bg-card p-2 shadow-sm focus-within:border-ring"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-1">
          <input
            accept={CHAT_ACCEPT}
            aria-label="Attach files"
            className="hidden"
            multiple
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />
          <Button
            aria-label="Attach files"
            className="size-11 shrink-0"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="ghost"
          >
            <PlusIcon aria-hidden="true" className="size-5" />
          </Button>

          <textarea
            aria-label={`Message ${TIP_NAME}`}
            className="field-sizing-content max-h-48 min-h-11 w-full resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground"
            disabled={disabled}
            enterKeyHint={coarsePointer ? "enter" : "send"}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={text}
          />

          {streaming ? (
            <Button
              aria-label="Stop answering"
              className="size-11 shrink-0"
              onClick={() => onStop?.()}
              type="button"
            >
              <SquareIcon aria-hidden="true" className="size-4" />
            </Button>
          ) : (
            <Button
              aria-label="Send message"
              className="size-11 shrink-0"
              disabled={!canSend}
              type="submit"
            >
              <SendIcon aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </form>

      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {disabled && disabledReason
          ? disabledReason
          : failed
            ? "Retry or remove the failed file before sending."
            : attachments.length > 0
              ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}.`
              : CHAT_CAPABILITY_LINE}
      </p>
    </div>
  );
}
