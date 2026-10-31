"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DefaultChatTransport,
  type FileUIPart,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AllowanceNotice } from "@/components/chat/allowance-notice";
import { ChatAllowanceHint } from "@/components/chat/chat-allowance-hint";
import { CHAT_QUIZ_PREFILL } from "@/components/chat/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks";
import { useMessagesPaginated } from "@/hooks/useChat";
import { normalizeStoredParts } from "@/lib/chat-messages";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  ChatComposer,
  type ChatComposerPrefill,
  type ChatComposerRestore,
  type ChatComposerSubmission,
} from "./chat-composer";
import { ChatMessageList } from "./chat-message-list";
import { consumePendingChatMessage } from "./pending-message";
import { QuizRunner } from "./quiz-runner";
import { StarterRows } from "./starter-rows";
import { suggestionsFromParts } from "./suggested-replies";

type ChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  stoppedAt?: string | null;
  createdAt: string;
};

/** The words inside one message, without its attachments or tool parts. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function ConversationSession({
  conversationId,
  noteTitle,
  noteId,
  initialMessages,
  initialStoppedIds,
}: {
  conversationId: string;
  noteTitle: string | null;
  noteId: string | null;
  initialMessages: UIMessage[];
  initialStoppedIds: string[];
}) {
  const queryClient = useQueryClient();
  const { chatDailyUsage } = useUsage();

  const [prefill, setPrefill] = useState<ChatComposerPrefill>();
  const [restore, setRestore] = useState<ChatComposerRestore>();
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([]);
  const [stoppedIds, setStoppedIds] = useState<Set<string>>(
    () => new Set(initialStoppedIds),
  );
  const [quizRun, setQuizRun] = useState<{
    noteId: string | null;
    noteTitle: string | null;
  } | null>(null);

  useEffect(() => {
    const onClose = () => setQuizRun(null);
    window.addEventListener("ticlearn:quiz-close", onClose);
    return () => window.removeEventListener("ticlearn:quiz-close", onClose);
  }, []);

  const startedAt = useRef<number | null>(null);
  const lastSubmission = useRef<ChatComposerSubmission | null>(null);
  const titleRefresh = useRef<number | null>(null);

  const chat = useChat<UIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/ai/chat?conversationId=${conversationId}`,
      credentials: "include",
    }),
    experimental_throttle: 50,
    onFinish: ({ isAbort, isError, message }) => {
      const elapsed =
        startedAt.current === null ? null : Date.now() - startedAt.current;
      startedAt.current = null;
      lastSubmission.current = null;
      setDurationMs(elapsed);

      if (isAbort) {
        const answered = textOf(message).length > 0;
        if (answered) {
          // The server saved the partial answer and marked it stopped.
          setStoppedIds((current) => {
            const next = new Set(current);
            next.add(message.id);
            return next;
          });
        } else {
          // A stop before the first token leaves nothing to keep.
          chat.setMessages((current) =>
            current.filter((entry) => entry.id !== message.id),
          );
        }
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chatMessagesPaginated(conversationId),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
        return;
      }

      if (isError) return;

      // Chips exist only for the turn that just finished. A reloaded thread
      // carries the same tool part but draws no chips, by design.
      setLiveSuggestions(suggestionsFromParts(message.parts));
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chatConversations,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessagesPaginated(conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.usage });

      // The model names the conversation after the first turn, in the
      // background. One later read picks that name up without a reload; a
      // provisional name is already on screen from the first message.
      if (titleRefresh.current !== null) {
        window.clearTimeout(titleRefresh.current);
      }
      titleRefresh.current = window.setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chatConversations,
        });
      }, 4000);
    },
    onError: (chatError) => {
      toast.error(chatError.message || "Failed to send message");

      // A paste that had to travel as a text file is given back rather than
      // lost, with its size, when the provider refuses the file part.
      const last = lastSubmission.current;
      if (last?.textAttachment) {
        setRestore({
          text: [last.text, last.textAttachment]
            .filter((part) => part.trim().length > 0)
            .join("\n\n"),
          notice: `That paste is ${last.textAttachment.length.toLocaleString(
            "en-US",
          )} characters and could not be sent as a file. It is back in the box.`,
          nonce: Date.now(),
        });
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    },
  });

  const { messages, sendMessage, status, error } = chat;

  useEffect(() => {
    if (!error) return;
    console.error("[CHAT] Client error:", error);
  }, [error]);

  useEffect(
    () => () => {
      if (titleRefresh.current !== null) {
        window.clearTimeout(titleRefresh.current);
      }
    },
    [],
  );

  useEffect(() => {
    const pending = consumePendingChatMessage(conversationId);
    if (!pending?.text && !pending?.files?.length) return;

    startedAt.current = Date.now();
    void sendMessage({
      text: pending.text || "",
      files: (pending.files ?? []) as FileUIPart[],
    });
  }, [conversationId, sendMessage]);

  const handleSend = useCallback(
    async (submission: ChatComposerSubmission) => {
      if (!submission.text.trim() && submission.files.length === 0) return;

      // While the setup wizard is open the composer belongs to the wizard.
      // Typed text moves the same step forward, identical to a tap, so the
      // thread never stalls waiting for a tap that never lands.
      const wizardOpen =
        (window as unknown as { __ticlearn_wizard_open?: string })
          .__ticlearn_wizard_open === conversationId;
      if (
        wizardOpen &&
        submission.text.trim() &&
        submission.files.length === 0
      ) {
        window.dispatchEvent(
          new CustomEvent("ticlearn:wizard-text", {
            detail: { text: submission.text },
          }),
        );
        setRestore(undefined);
        return;
      }

      startedAt.current = Date.now();
      setDurationMs(null);
      setLiveSuggestions([]);
      setRestore(undefined);
      lastSubmission.current = submission;

      try {
        await chat.sendMessage({
          text: submission.text,
          files: submission.files,
        });
      } catch {
        startedAt.current = null;
        lastSubmission.current = null;
        setRestore({
          text: submission.text || submission.textAttachment || "",
          notice: "That message did not go through. It is back in the box.",
          nonce: Date.now(),
        });
      }
    },
    [chat, conversationId],
  );

  /**
   * A question edited in place keeps its id, so the transport rewrites it and
   * drops the answer that followed. The files already on the question travel
   * again, because the rewrite replaces its parts.
   */
  const handleEditSubmit = useCallback(
    async (message: UIMessage, text: string) => {
      const next = text.trim();
      if (!next) return;

      const files = message.parts.filter(
        (part): part is FileUIPart => part.type === "file" && "url" in part,
      );

      startedAt.current = Date.now();
      setDurationMs(null);
      setLiveSuggestions([]);
      setRestore(undefined);
      lastSubmission.current = { text: next, files };

      try {
        await chat.sendMessage(
          { text: next, files, messageId: message.id },
          { body: { editMessageId: message.id } },
        );
      } catch {
        startedAt.current = null;
        lastSubmission.current = null;
        setRestore({
          text: next,
          notice: "That edit did not go through. It is back in the box.",
          nonce: Date.now(),
        });
      }
    },
    [chat],
  );

  const handleReplaceAnswer = useCallback(
    (messageId?: string) => {
      startedAt.current = Date.now();
      setDurationMs(null);
      setLiveSuggestions([]);
      setRestore(undefined);

      if (!messageId) {
        void chat.regenerate();
        return;
      }

      setStoppedIds((current) => {
        if (!current.has(messageId)) return current;
        const next = new Set(current);
        next.delete(messageId);
        return next;
      });
      void chat.regenerate({
        messageId,
        body: { retryMessageId: messageId },
      });
    },
    [chat],
  );

  const handleMakeQuiz = useCallback(() => {
    setPrefill({ text: CHAT_QUIZ_PREFILL, nonce: Date.now() });
  }, []);

  const handleStartQuiz = useCallback(() => {
    setQuizRun({ noteId, noteTitle });
  }, [noteId, noteTitle]);

  const handleSuggestion = useCallback(
    (text: string) => {
      startedAt.current = Date.now();
      setDurationMs(null);
      setLiveSuggestions([]);
      void sendMessage({ text });
    },
    [sendMessage],
  );

  const spentAllowance =
    chatDailyUsage !== null &&
    chatDailyUsage.limit !== -1 &&
    chatDailyUsage.remaining <= 0;

  const lowAllowance =
    chatDailyUsage !== null &&
    chatDailyUsage.limit !== -1 &&
    chatDailyUsage.remaining > 0 &&
    chatDailyUsage.remaining <= 2;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-background via-background to-muted/20">
        {noteTitle ? (
          <p className="mx-auto w-full max-w-[48rem] shrink-0 px-4 pt-3 text-xs text-muted-foreground">
            Using{" "}
            <span className="font-medium text-foreground">{noteTitle}</span>
          </p>
        ) : null}
        <ChatMessageList
          className="min-h-0 flex-1"
          conversationId={conversationId}
          durationMs={durationMs}
          noteId={noteId}
          emptyState={
            <StarterRows
              onStart={(prompt) =>
                setPrefill({ text: prompt, nonce: Date.now() })
              }
              onQuiz={handleStartQuiz}
            />
          }
          messages={messages}
          onEditSubmit={handleEditSubmit}
          onMakeQuiz={handleMakeQuiz}
          onRegenerate={handleReplaceAnswer}
          onRetry={handleReplaceAnswer}
          onSuggestion={handleSuggestion}
          status={status}
          stoppedIds={stoppedIds}
          suggestions={liveSuggestions}
        />
        {quizRun && (
          <QuizRunner
            conversationId={conversationId}
            noteId={quizRun.noteId}
            noteTitle={quizRun.noteTitle}
          />
        )}
      </div>

      <div className="border-t bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-[48rem]">
          <div id="quiz-dock-slot" className="w-full" />
          {spentAllowance ? (
            <AllowanceNotice resetsAt={chatDailyUsage?.resetsAt} />
          ) : (
            <div className="space-y-2">
              {lowAllowance && chatDailyUsage ? (
                <ChatAllowanceHint
                  remaining={chatDailyUsage.remaining}
                  resetsAt={chatDailyUsage.resetsAt}
                />
              ) : null}
              <ChatComposer
                draftKey={conversationId}
                onSubmit={handleSend}
                onStop={() => chat.stop()}
                prefill={prefill}
                restore={restore}
                status={status}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatThread({ conversationId }: { conversationId: string }) {
  const {
    messages: paginatedMessages,
    conversationInfo,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessagesPaginated(conversationId);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const initialMessages = useMemo(
    () =>
      paginatedMessages.map((message: ChatMessageRecord) => ({
        id: message.id,
        role: message.role as UIMessage["role"],
        parts: normalizeStoredParts(message.parts, message.content),
      })),
    [paginatedMessages],
  );

  const initialStoppedIds = useMemo(
    () =>
      paginatedMessages
        .filter((message: ChatMessageRecord) => Boolean(message.stoppedAt))
        .map((message: ChatMessageRecord) => message.id),
    [paginatedMessages],
  );

  if (isPending) {
    return (
      <div
        className="mx-auto flex h-full w-full max-w-[48rem] flex-col gap-6 px-4 py-6"
        data-slot="chat-thread-skeleton"
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn("space-y-2", i % 2 === 0 ? "ml-auto w-2/3" : "w-3/4")}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !conversationInfo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="text-xl font-semibold">Conversation unavailable</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          This chat could not be loaded. It may have been deleted or you may no
          longer have access to it.
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {hasNextPage && (
        <div className="absolute left-0 right-0 top-0 z-10 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full bg-muted px-4 py-1 text-xs text-muted-foreground shadow transition-colors hover:bg-muted/80"
          >
            {isFetchingNextPage ? "Loading..." : "Load older messages"}
          </button>
        </div>
      )}
      <div ref={sentinelRef} className="h-1" />
      <ConversationSession
        key={conversationId}
        conversationId={conversationId}
        initialMessages={initialMessages}
        initialStoppedIds={initialStoppedIds}
        noteTitle={conversationInfo.note?.title ?? null}
        noteId={conversationInfo.note?.id ?? null}
      />
    </div>
  );
}
