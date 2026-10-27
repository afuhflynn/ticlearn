"use client";

import { upload } from "@vercel/blob/client";
import type { FileUIPart } from "ai";
import {
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
import { isImageFile } from "@/components/chat/file-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { chatFileMetaFor } from "@/lib/chat/file-meta";
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
  /** A local preview for an image, ready before the upload answers. */
  objectUrl?: string;
  progress: number;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
  textContent?: string;
  source: "file" | "paste";
};

/** A local preview costs one object URL, and jsdom has none to give. */
function localPreviewFor(file: File): string | undefined {
  try {
    return URL.createObjectURL(file);
  } catch {
    return undefined;
  }
}

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

/** The stroke circle of the upload ring, drawn on a 36 by 36 view box. */
const RING_CIRCUMFERENCE = 2 * Math.PI * 15.5;

function ImageAttachmentTile({
  item,
  onRemove,
  onRetry,
}: {
  item: ComposerAttachment;
  onRemove: (id: string) => void;
  onRetry: (item: ComposerAttachment) => void;
}) {
  return (
    <div className="group relative">
      <div className="relative size-[84px] overflow-hidden rounded-xl border bg-muted">
        {/* biome-ignore lint/performance/noImgElement: chat files come from arbitrary Blob and local preview origins that next/image cannot preconfigure. */}
        <img
          alt={item.name}
          className={cn(
            "size-full object-cover",
            item.status === "uploading" && "scale-110 blur-[6px]",
            item.status === "failed" && "opacity-60",
          )}
          src={item.objectUrl ?? item.url}
        />
        {item.status === "uploading" ? (
          <div className="absolute inset-0 grid place-items-center bg-background/40">
            {/* The ring moves with real upload progress; nothing spins. */}
            <svg className="size-9 text-foreground" viewBox="0 0 36 36">
              <title>Upload progress</title>
              <circle
                className="stroke-foreground/25"
                cx="18"
                cy="18"
                fill="none"
                r="15.5"
                strokeWidth="3"
              />
              <circle
                className="stroke-foreground"
                cx="18"
                cy="18"
                fill="none"
                r="15.5"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={
                  RING_CIRCUMFERENCE * (1 - item.progress / 100)
                }
                strokeLinecap="round"
                strokeWidth="3"
                transform="rotate(-90 18 18)"
              />
            </svg>
          </div>
        ) : null}
      </div>
      {item.status === "failed" && item.source === "file" ? (
        <Button
          className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full p-0"
          onClick={() => onRetry(item)}
          type="button"
          variant="outline"
        >
          <RotateCwIcon className="size-4" />
          <span className="sr-only">Retry {item.name}</span>
        </Button>
      ) : null}
      <Button
        className="absolute -right-1.5 -top-1.5 size-6 rounded-full border bg-background p-0 shadow-sm"
        onClick={() => onRemove(item.id)}
        type="button"
        variant="outline"
      >
        <XIcon className="size-3.5" />
        <span className="sr-only">Remove {item.name}</span>
      </Button>
      <span className="sr-only">
        {item.status === "uploading"
          ? `Uploading ${item.name} · ${item.progress}%`
          : item.status === "failed"
            ? (item.error ?? `${item.name} failed`)
            : `${item.name} attached`}
      </span>
    </div>
  );
}

function DocumentAttachmentTile({
  item,
  onRemove,
  onRetry,
  onShowPaste,
}: {
  item: ComposerAttachment;
  onRemove: (id: string) => void;
  onRetry: (item: ComposerAttachment) => void;
  onShowPaste: (item: ComposerAttachment) => void;
}) {
  const meta = chatFileMetaFor(item.mediaType);
  const uploading = item.status === "uploading";
  const fileFailed = item.status === "failed" && item.source === "file";
  return (
    <div className="flex w-56 max-w-full items-center gap-2 rounded-xl border p-1.5 pr-1">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          meta.tile,
        )}
      >
        <meta.Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(item.size)}
          {uploading
            ? ` · ${item.progress}%`
            : item.status === "failed"
              ? " · failed"
              : ""}
        </p>
        {item.source === "paste" ? (
          <Button
            className="h-auto px-0 text-left text-xs font-normal"
            onClick={() => onShowPaste(item)}
            type="button"
            variant="link"
          >
            Show in text field
          </Button>
        ) : null}
        {item.status === "failed" && item.error ? (
          <p className="truncate text-xs text-destructive">{item.error}</p>
        ) : null}
      </div>
      {fileFailed ? (
        <Button
          className="size-7 shrink-0"
          onClick={() => onRetry(item)}
          type="button"
          variant="ghost"
        >
          <RotateCwIcon className="size-4" />
          <span className="sr-only">Retry {item.name}</span>
        </Button>
      ) : null}
      <Button
        className="size-7 shrink-0"
        onClick={() => onRemove(item.id)}
        type="button"
        variant="ghost"
      >
        <XIcon className="size-4" />
        <span className="sr-only">Remove {item.name}</span>
      </Button>
    </div>
  );
}

export function ChatComposer({
  disabled,
  disabledReason,
  draftKey,
  initialText,
  onSubmit,
  onStop,
  prefill,
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

  // A starter card, or Make a quiz from this.
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

  // A rejected submission comes back to the box, with the reason.
  useEffect(() => {
    if (!restore) return;
    setText(restore.text);
    setNotice(restore.notice);
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [restore]);

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
          objectUrl: isImageFile(file.type) ? localPreviewFor(file) : undefined,
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

  const revokeObjectUrl = useCallback((item: ComposerAttachment) => {
    if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
  }, []);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((current) => {
        const leaving = current.find((item) => item.id === id);
        if (leaving) revokeObjectUrl(leaving);
        return current.filter((item) => item.id !== id);
      });
    },
    [revokeObjectUrl],
  );

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
    (event?: FormEvent<HTMLFormElement>) => {
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

      const submission: ChatComposerSubmission = {
        text: text.trim(),
        files,
        textAttachment: paste?.textContent,
      };

      // The box is cleared at once, before the answer starts, so the message
      // on screen is the message that was sent. A rejected send puts its text
      // back through the restore prop.
      setText("");
      for (const item of attachments) revokeObjectUrl(item);
      setAttachments([]);
      setNotice(null);
      setShowAllAttachments(false);
      try {
        window.sessionStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore an unavailable session storage.
      }

      void onSubmit(submission);
    },
    [
      attachments,
      canSend,
      draftStorageKey,
      onStop,
      onSubmit,
      revokeObjectUrl,
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
      handleSubmit();
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
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-start gap-2">
            {visibleAttachments.map((item) =>
              isImageFile(item.mediaType) ? (
                <ImageAttachmentTile
                  item={item}
                  key={item.id}
                  onRemove={removeAttachment}
                  onRetry={retryAttachment}
                />
              ) : (
                <DocumentAttachmentTile
                  item={item}
                  key={item.id}
                  onRemove={removeAttachment}
                  onRetry={retryAttachment}
                  onShowPaste={showPasteInTextField}
                />
              ),
            )}
            {hiddenCount > 0 ? (
              <Button
                className="size-[84px] min-w-11 px-3 text-xs"
                onClick={() => setShowAllAttachments(true)}
                type="button"
                variant="outline"
              >
                +{hiddenCount}
                <span className="sr-only"> more attachments</span>
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-end gap-1">
          <Input
            accept={CHAT_ACCEPT}
            className="hidden"
            id="chat-attachment-input"
            multiple
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="size-11 shrink-0"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  type="button"
                  variant="ghost"
                >
                  <PlusIcon className="size-5" />
                  <span className="sr-only">Attach files</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <label className="sr-only" htmlFor="chat-message-input">
            Message {TIP_NAME}
          </label>
          <Textarea
            className="max-h-48 min-h-11 resize-none border-0 bg-transparent px-1 py-2.5 text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
            disabled={disabled}
            enterKeyHint={coarsePointer ? "enter" : "send"}
            id="chat-message-input"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={text}
          />

          {streaming ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-11 shrink-0"
                    onClick={() => onStop?.()}
                    type="button"
                  >
                    <SquareIcon className="size-4" />
                    <span className="sr-only">Stop answering</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop answering</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-11 shrink-0"
                    disabled={!canSend}
                    type="submit"
                  >
                    <SendIcon className="size-4" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
