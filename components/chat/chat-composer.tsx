"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
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
    if (disabled) {
      return true;
    }

    return !(text.trim() || attachments.length > 0) || status === "streaming";
  }, [attachments.length, disabled, status, text]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      if (!(message.text?.trim() || message.files?.length)) {
        return;
      }

      if (message.files?.length) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      await onSubmit(message);
      setText("");
      setAttachments([]);
    },
    [onSubmit],
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
            disabled={disabled}
            onChange={handleTextChange}
            placeholder="Ask TiC about your notes, quizzes, or studies..."
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
          <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
        </PromptInputFooter>
      </PromptInput>
      {disabledReason ? (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      ) : null}
    </div>
  );
}
