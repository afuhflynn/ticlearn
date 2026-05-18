"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FileUIPart } from "ai";
import {
  Attachment,
  type AttachmentData,
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
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

function AttachmentItem({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}) {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id);
  }, [attachment.id, onRemove]);

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
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
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [uploading, setUploading] = useState(false);

  const { startUpload } = useUploadThing("chatUploader", {
    onUploadError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const isSubmitDisabled = useMemo(() => {
    if (disabled || uploading) return true;
    return !(text.trim() || attachments.length > 0) || status === "streaming";
  }, [attachments.length, disabled, status, text, uploading]);

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
            const mimeType = f.mediaType || blob.type || "application/octet-stream";
            rawFiles.push(
              new File([blob], f.filename || `file.${fileExt}`, {
                type: mimeType,
              }),
            );
          }
        }

        if (rawFiles.length > 0) {
          setUploading(true);
          try {
            const uploaded = await startUpload(rawFiles);
            if (!uploaded || uploaded.length === 0) {
              toast.error("No files were uploaded");
              setUploading(false);
              return;
            }

            const utFiles: FileUIPart[] = uploaded.map((u) => ({
              type: "file",
              mediaType:
                rawFiles.find(
                  (rf) =>
                    u.name === rf.name || u.url.includes(encodeURIComponent(rf.name)),
                )?.type || "application/octet-stream",
              filename: u.name,
              url: u.url,
            }));

            const nonBlobFiles = files.filter((f) => !f.url.startsWith("blob:"));
            files = [...nonBlobFiles, ...utFiles];
          } catch {
            toast.error("Failed to upload files");
            setUploading(false);
            return;
          }
          setUploading(false);
        }
      }

      await onSubmit({ text: message.text || "", files });
      setText("");
      setAttachments([]);
    },
    [onSubmit, startUpload],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <PromptInput globalDrop multiple onSubmit={handleSubmit}>
        <PromptInputHeader>
          {attachments.length > 0 && (
            <Attachments variant="inline">
              {attachments.map((attachment) => (
                <AttachmentItem
                  attachment={attachment}
                  key={attachment.id}
                  onRemove={handleAttachmentRemove}
                />
              ))}
            </Attachments>
          )}
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea
            disabled={disabled || uploading}
            onChange={handleTextChange}
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
          <PromptInputSubmit disabled={isSubmitDisabled} status={uploading ? "submitted" : status} />
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
