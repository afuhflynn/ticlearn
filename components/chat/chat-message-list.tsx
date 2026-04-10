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
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

function MessageBody({ message }: { message: UIMessage }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n");
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
          <MessageResponse>{text.trim() || toolSummary}</MessageResponse>
        </MessageContent>
      ) : null}

      {message.role === "assistant" && (
        <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageAction
            tooltip="Copy response"
            onClick={() => handleCopy(text.trim(), message.id)}
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
