"use client";

import { isTextUIPart, type UIMessage } from "ai";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { StreamingCaret } from "@/components/ai-elements/streaming-caret";
import { ActivityBlock } from "@/components/chat/activity-block";
import { CHAT_STOPPED_LABEL } from "@/components/chat/constants";
import { FilePreview } from "@/components/chat/file-preview";
import { SuggestedReplies } from "@/components/chat/suggested-replies";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

const ACTION_ROW =
  "flex items-center gap-1 opacity-100 transition-opacity [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-focus-within:opacity-100 [@media(pointer:fine)]:group-hover:opacity-100";

function normalizeMarkdownForDisplay(content: string) {
  if (!content) return content;

  return content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/(^|\n)[ \t]*(#{1,6})[ \t]*/g, "$1$2 ")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n");
}

function MessageFileParts({ parts }: { parts: UIMessage["parts"] }) {
  const fileParts = parts.filter(
    (
      part,
    ): part is {
      type: "file";
      mediaType: string;
      filename?: string;
      url: string;
    } => part.type === "file" && "url" in part,
  );

  if (fileParts.length === 0) return null;

  return (
    <div className="mb-1 flex flex-wrap gap-2">
      {fileParts.map((part) => (
        <FilePreview
          file={{
            url: part.url,
            filename: part.filename,
            mediaType: part.mediaType,
          }}
          key={`${part.url}-${part.filename ?? "file"}`}
        />
      ))}
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);

  const copy = (value: string) => {
    if (!value.trim()) return;
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        toast.success("Copied to clipboard");
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Could not copy that text."));
  };

  return { copied, copy };
}

function AnswerActions({
  message,
  onRegenerate,
  onMakeQuiz,
}: {
  message: UIMessage;
  onRegenerate?: (messageId: string) => void;
  onMakeQuiz?: () => void;
}) {
  const { copied, copy } = useCopy();
  const text = normalizeMarkdownForDisplay(messageText(message)).trim();

  return (
    <MessageActions className={ACTION_ROW}>
      <MessageAction
        className="size-11"
        label="Copy answer"
        onClick={() => copy(text)}
      >
        {copied ? (
          <CheckIcon aria-hidden="true" className="size-4 text-green-600" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-4" />
        )}
      </MessageAction>
      <MessageAction
        className="size-11"
        label="Regenerate answer"
        onClick={() => onRegenerate?.(message.id)}
      >
        <RefreshCwIcon aria-hidden="true" className="size-4" />
      </MessageAction>
      <MessageAction
        className="size-11"
        label="Make a quiz from this"
        onClick={() => onMakeQuiz?.()}
      >
        <SparklesIcon aria-hidden="true" className="size-4" />
      </MessageAction>
    </MessageActions>
  );
}

function QuestionActions({
  message,
  onEdit,
}: {
  message: UIMessage;
  onEdit?: (message: UIMessage) => void;
}) {
  const { copied, copy } = useCopy();

  return (
    <MessageActions className={cn(ACTION_ROW, "justify-end")}>
      <MessageAction
        className="size-11"
        label="Copy question"
        onClick={() => copy(messageText(message).trim())}
      >
        {copied ? (
          <CheckIcon aria-hidden="true" className="size-4 text-green-600" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-4" />
        )}
      </MessageAction>
      <MessageAction
        className="size-11"
        label="Edit question"
        onClick={() => onEdit?.(message)}
      >
        <PencilIcon aria-hidden="true" className="size-4" />
      </MessageAction>
    </MessageActions>
  );
}

function StoppedLine({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{CHAT_STOPPED_LABEL}</span>
      {onRetry ? (
        <Button
          className="min-h-11"
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon aria-hidden="true" className="mr-1.5 size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The line shown from the moment send is pressed, before any answer text
 * exists. It is the same disclosure the answer will carry, so nothing jumps
 * when the first token lands.
 */
function ThinkingLine({ status }: { status: ChatStatus }) {
  return (
    <Message from="assistant">
      <ActivityBlock parts={[]} status={status} />
    </Message>
  );
}

function FailedLine({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
      <p>
        The connection dropped before that answer finished. What already arrived
        is still above.
      </p>
      {onRetry ? (
        <Button
          className="min-h-11"
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon aria-hidden="true" className="mr-1.5 size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function MessageBody({
  message,
  isStreaming = false,
  isNewestAssistant = false,
  stopped = false,
  durationMs,
  suggestions,
  onRetry,
  onRegenerate,
  onEdit,
  onMakeQuiz,
  onSuggestion,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  isNewestAssistant?: boolean;
  stopped?: boolean;
  durationMs?: number | null;
  suggestions?: string[];
  onRetry?: (messageId?: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (message: UIMessage) => void;
  onMakeQuiz?: () => void;
  onSuggestion?: (text: string) => void;
}) {
  const text = useMemo(() => messageText(message), [message]);
  const normalizedText = normalizeMarkdownForDisplay(text);
  const isAssistant = message.role === "assistant";

  // The caret lives at the end of the last paragraph while tokens arrive.
  const components = useMemo(
    () => ({
      p: ({ children, ...props }: ComponentProps<"p">) => (
        <p {...props}>
          {children}
          {isStreaming ? <StreamingCaret /> : null}
        </p>
      ),
    }),
    [isStreaming],
  );

  if (isAssistant) {
    return (
      <>
        <ActivityBlock
          durationMs={durationMs}
          parts={message.parts}
          status={isStreaming ? "streaming" : "ready"}
        />

        {normalizedText.trim() ? (
          <div className="chat-answer w-full text-sm leading-7">
            <MessageResponse components={components}>
              {normalizedText}
            </MessageResponse>
          </div>
        ) : null}

        {stopped ? <StoppedLine onRetry={() => onRetry?.(message.id)} /> : null}

        {isNewestAssistant && suggestions && suggestions.length > 0 ? (
          <SuggestedReplies
            onSelect={(question) => onSuggestion?.(question)}
            questions={suggestions}
          />
        ) : null}

        {!isStreaming && normalizedText.trim() ? (
          <AnswerActions
            message={message}
            onMakeQuiz={onMakeQuiz}
            onRegenerate={onRegenerate}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <MessageContent>
        <MessageFileParts parts={message.parts} />
        {normalizedText.trim() ? (
          <p className="whitespace-pre-wrap break-words">{normalizedText}</p>
        ) : null}
      </MessageContent>
      <QuestionActions message={message} onEdit={onEdit} />
    </>
  );
}

export function ChatMessageList({
  messages,
  status,
  emptyState,
  onRetry,
  onRegenerate,
  onEdit,
  onMakeQuiz,
  onSuggestion,
  stoppedIds,
  durationMs,
  suggestions,
  className,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  emptyState?: React.ReactNode;
  /** Sends the last question again through the same transport. */
  onRetry?: (messageId?: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (message: UIMessage) => void;
  onMakeQuiz?: () => void;
  onSuggestion?: (text: string) => void;
  stoppedIds?: Set<string>;
  durationMs?: number | null;
  suggestions?: string[];
  className?: string;
}) {
  const lastMessage = messages[messages.length - 1];
  const lastAssistantIndex = messages.reduce(
    (found, message, index) => (message.role === "assistant" ? index : found),
    -1,
  );

  // While nothing has come back yet, the activity line stands where the
  // answer will be. Once an assistant message exists it carries its own.
  const showThinkingLine =
    (status === "submitted" || status === "streaming") &&
    (!lastMessage || lastMessage.role !== "assistant");

  const isStreamingAnswer = status === "streaming";

  return (
    <Conversation className={cn("h-full", className)}>
      <ConversationContent>
        {messages.length === 0 && emptyState ? emptyState : null}

        {messages.map((message, index) => (
          <Message from={message.role} key={message.id}>
            <MessageBody
              durationMs={
                index === lastAssistantIndex && status === "ready"
                  ? durationMs
                  : undefined
              }
              isNewestAssistant={
                index === lastAssistantIndex && status === "ready"
              }
              isStreaming={
                isStreamingAnswer &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
              message={message}
              onEdit={onEdit}
              onMakeQuiz={onMakeQuiz}
              onRegenerate={onRegenerate}
              onRetry={onRetry}
              onSuggestion={onSuggestion}
              stopped={stoppedIds?.has(message.id) ?? false}
              suggestions={
                index === lastAssistantIndex ? suggestions : undefined
              }
            />
          </Message>
        ))}

        {showThinkingLine ? <ThinkingLine status={status} /> : null}

        {status === "error" ? <FailedLine onRetry={() => onRetry?.()} /> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
