"use client";

import type { FileUIPart } from "ai";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Attachment,
  type AttachmentData,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

function AttachmentItem({
  attachment,
  uploadProgress,
}: {
  attachment: AttachmentData;
  uploadProgress: number | null;
}) {
  const { remove } = usePromptInputAttachments();

  return (
    <Attachment data={attachment} onRemove={() => remove(attachment.id)}>
      <AttachmentPreview />
      <AttachmentInfo className="pr-6" showMediaType />
      <AttachmentRemove />
      {uploadProgress !== null ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-full bg-primary/10">
          <span
            className="block h-full bg-primary transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </span>
      ) : null}
    </Attachment>
  );
}

export function ChatComposer({
  disabled,
  disabledReason,
  onSubmit,
  status,
  className,
}: {
  disabled?: boolean;
  disabledReason?: string;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  status: "submitted" | "streaming" | "ready" | "error";
  className?: string;
}) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { startUpload } = useUploadThing("chatUploader", {
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
      setUploading(false);
      setUploadProgress(null);
    },
    onUploadProgress: (progress) => {
      setUploadProgress(progress);
    },
  });

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;

      const isMobile =
        typeof window !== "undefined" &&
        (window.matchMedia("(max-width: 768px)").matches ||
          window.matchMedia("(pointer: coarse)").matches);

      if (isMobile) {
        event.preventDefault();
        event.stopPropagation();
        setText((current) => `${current}\n`);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (!(message.text?.trim() || message.files?.length)) return;

      let files = message.files;

      if (files?.length) {
        const rawFiles: File[] = [];

        for (const f of files) {
          if (f.url.startsWith("blob:")) {
            const resp = await fetch(f.url);
            const blob = await resp.blob();
            const fileExt = f.filename?.split(".").pop() || "bin";
            const mimeType =
              f.mediaType || blob.type || "application/octet-stream";
            rawFiles.push(
              new File([blob], f.filename || `file.${fileExt}`, {
                type: mimeType,
              }),
            );
          }
        }

        if (rawFiles.length > 0) {
          setUploading(true);
          setUploadProgress(1);
          try {
            const uploaded = await startUpload(rawFiles);
            if (!uploaded || uploaded.length === 0) {
              toast.error("No files were uploaded");
              setUploading(false);
              setUploadProgress(null);
              return;
            }

            const utFiles: FileUIPart[] = uploaded.map((u) => ({
              type: "file",
              mediaType:
                rawFiles.find(
                  (rf) =>
                    u.name === rf.name ||
                    u.url.includes(encodeURIComponent(rf.name)),
                )?.type || "application/octet-stream",
              filename: u.name,
              url: u.url,
            }));

            const nonBlobFiles = files.filter(
              (f) => !f.url.startsWith("blob:"),
            );
            files = [...nonBlobFiles, ...utFiles];
          } catch {
            toast.error("Failed to upload files");
            setUploading(false);
            setUploadProgress(null);
            return;
          }
          setUploading(false);
          setUploadProgress(null);
        }
      }

      await onSubmit({ text: message.text || "", files });
      setText("");
    },
    [onSubmit, startUpload],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <PromptInput
        accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json"
        globalDrop
        maxFiles={10}
        maxFileSize={16 * 1024 * 1024}
        multiple
        onError={(err) => toast.error(err.message)}
        onSubmit={handleSubmit}
      >
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => (
              <Attachments variant="inline">
                <AttachmentItem
                  attachment={attachment}
                  uploadProgress={uploading ? (uploadProgress ?? 8) : null}
                />
              </Attachments>
            )}
          </PromptInputAttachments>
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled || uploading}
            onChange={handleTextChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={
              uploading
                ? "Uploading files..."
                : "Ask TiC about your notes, quizzes, or studies..."
            }
            value={text}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={disabled || uploading || status === "streaming"}
            status={uploading ? "submitted" : status}
          />
        </PromptInputFooter>
      </PromptInput>
      {uploading ? (
        <p className="text-sm text-muted-foreground">Uploading files...</p>
      ) : disabledReason ? (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
