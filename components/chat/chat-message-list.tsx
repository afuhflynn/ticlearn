"use client";

import { isTextUIPart, type UIMessage } from "ai";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function MessageFileParts({
  parts,
  side,
}: {
  parts: UIMessage["parts"];
  /** Which edge the tiles hug; the student's row hugs the right. */
  side?: "start" | "end";
}) {
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
    // The row hugs one edge outside the bubble, the way ChatGPT hangs a
    // thumbnail above its own message. Tiles wrap, so many files stay in
    // same-size squares instead of one growing card.
    <div
      className={cn(
        "mb-0.5 flex w-full flex-wrap gap-2",
        side === "end" ? "justify-end" : "justify-start",
      )}
    >
      {fileParts.map((part) => (
        <FilePreview
          file={{
            url: part.url,
            filename: part.filename,
            mediaType: part.mediaType,
          }}
          key={`${part.url}-${part.filename ?? "file"}`}
          variant="message"
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
        tooltip="Copy answer"
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
        tooltip="Regenerate answer"
        onClick={() => onRegenerate?.(message.id)}
      >
        <RefreshCwIcon aria-hidden="true" className="size-4" />
      </MessageAction>
      <MessageAction
        className="size-11"
        label="Make a quiz from this"
        tooltip="Make a quiz from this"
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
  canEdit = true,
}: {
  message: UIMessage;
  onEdit?: (message: UIMessage) => void;
  canEdit?: boolean;
}) {
  const { copied, copy } = useCopy();

  return (
    <MessageActions className={cn(ACTION_ROW, "justify-end")}>
      <MessageAction
        className="size-11"
        label="Copy question"
        tooltip="Copy question"
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
        disabled={!canEdit}
        label="Edit question"
        tooltip="Edit question"
        onClick={() => onEdit?.(message)}
      >
        <PencilIcon aria-hidden="true" className="size-4" />
      </MessageAction>
    </MessageActions>
  );
}

/**
 * A question is edited where it sits in the thread, not in the composer at the
 * bottom of the page. Saving rewrites the question and replaces the answer that
 * followed it, which is what the server already does for an edited turn.
 */
function QuestionEditor({
  message,
  onSave,
  onCancel,
}: {
  message: UIMessage;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => messageText(message));
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const inputId = `edit-question-${message.id}`;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, []);

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    onSave(next);
  };

  return (
    <div className="ml-auto w-full rounded-[var(--radius)] border border-primary/40 bg-card p-2 shadow-sm">
      <label className="sr-only" htmlFor={inputId}>
        Edit your question
      </label>
      <Textarea
        className="max-h-48 min-h-11 resize-none border-0 bg-transparent px-1 py-2 text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
        enterKeyHint="send"
        id={inputId}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key !== "Enter" || event.shiftKey) return;
          if (event.nativeEvent.isComposing) return;
          // On a phone, Return adds a line and the Save button is the action,
          // the same rule the composer follows.
          if (window.matchMedia("(pointer: coarse)").matches) return;
          event.preventDefault();
          save();
        }}
        ref={boxRef}
        rows={Math.min(8, Math.max(2, draft.split("\n").length))}
        value={draft}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Sending will replace this answer and everything after it.
      </p>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          className="min-h-11"
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11"
          disabled={!draft.trim()}
          onClick={save}
          size="sm"
          type="button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function StoppedLine({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{CHAT_STOPPED_LABEL}</span>
      {onRetry ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Try again</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Try again</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
  onEditSubmit,
  onEditCancel,
  onMakeQuiz,
  onSuggestion,
  editing = false,
  canEdit = true,
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
  onEditSubmit?: (message: UIMessage, text: string) => void;
  onEditCancel?: () => void;
  onMakeQuiz?: () => void;
  onSuggestion?: (text: string) => void;
  editing?: boolean;
  canEdit?: boolean;
}) {
  const text = useMemo(() => messageText(message), [message]);
  const normalizedText = normalizeMarkdownForDisplay(text);
  const isAssistant = message.role === "assistant";

  // The caret lives at the end of the last paragraph while tokens arrive.
  // A link the model gives the student navigates like the app's own links:
  // inside the app through the router, outside in a new tab.
  const components = useMemo(
    () => ({
      p: ({ children, ...props }: ComponentProps<"p">) => (
        <p {...props}>
          {children}
          {isStreaming ? <StreamingCaret /> : null}
        </p>
      ),
      a: ({ children, href, ...props }: ComponentProps<"a">) => {
        const prose = "font-medium underline underline-offset-2";
        if (href?.startsWith("/")) {
          return (
            <Link className={prose} href={href} {...props}>
              {children}
            </Link>
          );
        }
        return (
          // biome-ignore lint/suspicious/noBlankTarget: an answer link the app does not own must not navigate the thread away.
          <a
            className={prose}
            href={href}
            rel="noreferrer"
            target="_blank"
            {...props}
          >
            {children}
          </a>
        );
      },
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

  if (editing) {
    return (
      <>
        {message.parts.some((part) => part.type === "file" && "url" in part) ? (
          <MessageFileParts parts={message.parts} side="end" />
        ) : null}
        <QuestionEditor
          message={message}
          onCancel={() => onEditCancel?.()}
          onSave={(text) => onEditSubmit?.(message, text)}
        />
      </>
    );
  }

  return (
    <>
      <MessageFileParts parts={message.parts} side="end" />
      {normalizedText.trim() ? (
        <MessageContent>
          <p className="whitespace-pre-wrap break-words">{normalizedText}</p>
        </MessageContent>
      ) : null}
      <QuestionActions canEdit={canEdit} message={message} onEdit={onEdit} />
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
  onEditSubmit,
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
  /** Opens the question in place. Calling it again closes the editor. */
  onEdit?: (message: UIMessage) => void;
  onEditSubmit?: (message: UIMessage, text: string) => void;
  onMakeQuiz?: () => void;
  onSuggestion?: (text: string) => void;
  stoppedIds?: Set<string>;
  durationMs?: number | null;
  suggestions?: string[];
  className?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const lastMessage = messages[messages.length - 1];
  const lastAssistantIndex = messages.reduce(
    (found, message, index) => (message.role === "assistant" ? index : found),
    -1,
  );

  const handleEdit = (message: UIMessage) => {
    onEdit?.(message);
    setEditingId((current) => (current === message.id ? null : message.id));
  };

  const handleEditSubmit = (message: UIMessage, text: string) => {
    setEditingId(null);
    onEditSubmit?.(message, text);
  };

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
              canEdit={status === "ready"}
              durationMs={
                index === lastAssistantIndex && status === "ready"
                  ? durationMs
                  : undefined
              }
              editing={message.role === "user" && editingId === message.id}
              isNewestAssistant={
                index === lastAssistantIndex && status === "ready"
              }
              isStreaming={
                isStreamingAnswer &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
              message={message}
              onEdit={handleEdit}
              onEditCancel={() => setEditingId(null)}
              onEditSubmit={handleEditSubmit}
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
