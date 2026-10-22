"use client";

import {
  isReasoningUIPart,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import {
  CheckIcon,
  CopyIcon,
  FileIcon,
  FileTextIcon,
  RefreshCw,
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
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { StreamingCaret } from "@/components/ai-elements/streaming-caret";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { TIP_NAME } from "@/components/chat/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function normalizeMarkdownForDisplay(content: string) {
  if (!content) return content;

  return content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/(^|\n)[ \t]*(#{1,6})[ \t]*/g, "$1$2 ")
    .replace(/([^\n])\n(#{1,6}\s)/g, "$1\n\n$2");
}

function getToolTitle(toolType: string) {
  return toolType
    .replace(/^tool-/, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function summarizeToolPart(
  part:
    | ToolUIPart
    | (UIMessage["parts"][number] & {
        state?: string;
        output?: unknown;
        errorText?: string;
      }),
) {
  if (part.state === "output-error") {
    return part.errorText ?? "The tool returned an error.";
  }

  if (part.state !== "output-available") {
    return `${getToolTitle(part.type)} is still running.`;
  }

  const output =
    "output" in part
      ? (part.output as Record<string, unknown> | undefined)
      : {};

  if (part.type === "tool-getUserNotes" || part.type === "tool-searchNotes") {
    const notes = Array.isArray(output?.notes) ? output.notes : [];
    if (notes.length === 0) {
      return "No matching notes were found.";
    }

    return `I found ${notes.length} note${notes.length === 1 ? "" : "s"} in your library.`;
  }

  if (part.type === "tool-getUserQuizzes") {
    const quizzes = Array.isArray(output?.quizzes) ? output.quizzes : [];
    if (quizzes.length === 0) {
      return "No quizzes matched that request.";
    }

    return `I found ${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"} for you.`;
  }

  if (part.type === "tool-webSearch") {
    const results = Array.isArray(output?.results) ? output.results : [];
    return `Web search returned ${results.length} result${results.length === 1 ? "" : "s"}.`;
  }

  if (part.type === "tool-getStudyProgress") {
    return "I pulled your latest study progress details.";
  }

  if (part.type === "tool-getSubscriptionContext") {
    return "I checked your current subscription and access details.";
  }

  return "Tool results are available below.";
}

function ToolParts({ parts }: { parts: UIMessage["parts"] }) {
  const toolParts = parts.filter(isToolOrDynamicToolUIPart);

  if (toolParts.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {toolParts.map((part) => (
        <Tool
          className="group"
          defaultOpen={part.state !== "output-available"}
          key={part.toolCallId}
        >
          <ToolHeader
            state={part.state}
            title={getToolTitle(part.type)}
            type={part.type === "dynamic-tool" ? "tool-dynamic" : part.type}
          />
          <ToolContent>
            {"input" in part ? <ToolInput input={part.input} /> : null}
            <ToolOutput
              errorText={
                "errorText" in part ? (part.errorText ?? undefined) : undefined
              }
              output={"output" in part ? part.output : undefined}
            />
          </ToolContent>
        </Tool>
      ))}
    </div>
  );
}

function FileParts({ parts }: { parts: UIMessage["parts"] }) {
  const fileParts = parts.filter(
    (
      p,
    ): p is {
      type: "file";
      mediaType: string;
      filename?: string;
      url: string;
    } => p.type === "file" && "url" in p,
  );

  if (fileParts.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {fileParts.map((part) => {
        const isImage = part.mediaType?.startsWith("image/");
        const key = `${part.url}-${part.filename ?? "file"}`;

        if (isImage) {
          return (
            <a
              key={key}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              {/* biome-ignore lint/performance/noImgElement: Chat attachments use arbitrary signed/external URLs that cannot be preconfigured for next/image. */}
              <img
                alt={part.filename || "Attached image"}
                src={part.url}
                className="h-28 w-28 object-cover transition-opacity group-hover:opacity-80"
              />
            </a>
          );
        }

        const Icon =
          part.mediaType === "application/pdf" ? FileTextIcon : FileIcon;
        return (
          <a
            key={key}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs shadow-sm hover:bg-muted/50"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="max-w-32 truncate">{part.filename || "File"}</span>
          </a>
        );
      })}
    </div>
  );
}

function MessageBody({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n");
  const normalizedText = normalizeMarkdownForDisplay(text);
  const reasoning = message.parts
    .filter(isReasoningUIPart)
    .map((part) => part.text)
    .join("\n");
  const sourceParts = message.parts.filter(
    (part) => part.type === "source-url" || part.type === "source-document",
  );
  const toolSummary =
    !text.trim() && message.parts.some(isToolOrDynamicToolUIPart)
      ? message.parts
          .filter(isToolOrDynamicToolUIPart)
          .map((part) => summarizeToolPart(part))
          .join("\n")
      : "";

  // The caret is drawn inside every paragraph of the answer and the stylesheet
  // keeps it in the last one only, so it sits at the end of the text while
  // the tokens are still arriving.
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {message.role === "assistant" ? (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            {TIP_NAME}
          </span>
          Study assistant
        </div>
      ) : null}

      <FileParts parts={message.parts} />

      {sourceParts.length > 0 ? (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          <SourcesContent>
            {sourceParts.map((part, index) => (
              <Source
                href={"url" in part ? (part.url ?? "") : ""}
                key={`${message.id}-source-${index}`}
                title={"title" in part ? (part.title ?? "") : ""}
              />
            ))}
          </SourcesContent>
        </Sources>
      ) : null}

      {reasoning ? (
        <Reasoning duration={0}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoning}</ReasoningContent>
        </Reasoning>
      ) : null}

      {text.trim() || toolSummary ? (
        <MessageContent>
          <div className="chat-answer">
            <MessageResponse components={components}>
              {normalizedText.trim() || toolSummary}
            </MessageResponse>
          </div>
        </MessageContent>
      ) : null}

      <ToolParts parts={message.parts} />

      {message.role === "assistant" && (
        <MessageActions className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <MessageAction
            tooltip="Copy response"
            onClick={() => handleCopy(normalizedText.trim(), message.id)}
          >
            {copiedId === message.id ? (
              <CheckIcon className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5" />
            )}
          </MessageAction>
        </MessageActions>
      )}
    </>
  );
}

/**
 * The thinking line. It sits inside the answer bubble and it is the only
 * thing shown while the model has not answered. The first token replaces it.
 */
function ThinkingBubble() {
  return (
    <Message from="assistant">
      <MessageContent>
        <p className="text-sm text-muted-foreground">{TIP_NAME} is thinking…</p>
      </MessageContent>
    </Message>
  );
}

/**
 * The bubble for a failed answer. A plain line and a retry, never a lost
 * answer that reads as broken.
 */
function FailedBubble({ onRetry }: { onRetry?: () => void }) {
  return (
    <Message from="assistant">
      <MessageContent>
        <p className="text-sm text-muted-foreground">
          That answer did not make it through. Nothing was lost, so you can ask
          again.
        </p>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        ) : null}
      </MessageContent>
    </Message>
  );
}

export function ChatMessageList({
  messages,
  status,
  emptyState,
  onRetry,
  className,
}: {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  emptyState?: React.ReactNode;
  /** Sends the last question again through the same transport. */
  onRetry?: () => void;
  className?: string;
}) {
  const lastMessage = messages[messages.length - 1];
  const lastMessageHasText = lastMessage
    ? lastMessage.parts.some(
        (part) => isTextUIPart(part) && part.text.trim().length > 0,
      )
    : false;

  // The thinking line is shown until the first token arrives, and the first
  // token replaces it.
  const isThinking =
    (status === "submitted" || status === "streaming") &&
    (!lastMessage || lastMessage.role !== "assistant" || !lastMessageHasText);

  const isStreamingAnswer = status === "streaming" && lastMessageHasText;

  return (
    <Conversation className={cn("h-full", className)}>
      <ConversationContent>
        {messages.length === 0 && emptyState ? emptyState : null}

        {messages.map((message, index) => (
          <Message from={message.role} key={message.id}>
            <MessageBody
              message={message}
              isStreaming={isStreamingAnswer && index === messages.length - 1}
            />
          </Message>
        ))}

        {isThinking ? <ThinkingBubble /> : null}

        {status === "error" ? <FailedBubble onRetry={onRetry} /> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
