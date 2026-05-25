"use client";

import {
  isReasoningUIPart,
  isTextUIPart,
  isToolOrDynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon, FileIcon, FileTextIcon, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

function normalizeMarkdownForDisplay(content: string) {
  if (!content) return content;

  return content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/(^|\n)\s*(#{1,6})\s*/g, "$1$2 ")
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
    (p): p is { type: "file"; mediaType: string; filename?: string; url: string } =>
      p.type === "file" && "url" in p,
  );

  if (fileParts.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {fileParts.map((part, i) => {
        const isImage = part.mediaType?.startsWith("image/");

        if (isImage) {
          return (
            <a
              key={i}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={part.filename || "Attached image"}
                src={part.url}
                className="h-24 w-24 object-cover transition-opacity group-hover:opacity-80"
              />
            </a>
          );
        }

        const Icon = part.mediaType === "application/pdf" ? FileTextIcon : FileIcon;
        return (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="max-w-32 truncate">{part.filename || "File"}</span>
          </a>
        );
      })}
    </div>
  );
}

function MessageBody({ message }: { message: UIMessage }) {
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
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
          <MessageResponse>{normalizedText.trim() || toolSummary}</MessageResponse>
        </MessageContent>
      ) : null}

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

export function ChatMessageList({
  messages,
  status,
  emptyState,
  className,
}: {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  emptyState?: React.ReactNode;
  className?: string;
}) {
  return (
    <Conversation className={cn("h-full", className)}>
      <ConversationContent>
        {messages.length === 0 && emptyState ? emptyState : null}

        {messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageBody message={message} />
          </Message>
        ))}

        {(status === "submitted" || status === "streaming") &&
        messages[messages.length - 1]?.role !== "assistant" ? (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Loader size={14} />
            <span>TiC is thinking…</span>
          </div>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
