"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { TIP_NAME } from "@/components/chat/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckLimit, useUsage } from "@/hooks";
import { useMessagesPaginated } from "@/hooks/useChat";
import { normalizeStoredParts } from "@/lib/chat-messages";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ChatRatingBanner } from "./ChatRatingBanner";
import { ChatComposer } from "./chat-composer";
import { ChatMessageList } from "./chat-message-list";
import { CHAT_SUGGESTIONS } from "./constants";
import { consumePendingChatMessage } from "./pending-message";

type ChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  parts: unknown;
  createdAt: string;
};

function ConversationSession({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const queryClient = useQueryClient();
  const { allowed: canChat } = useCheckLimit("chat");
  const { chatDailyUsage } = useUsage();
  const { messages, sendMessage, regenerate, status, error } =
    useChat<UIMessage>({
      id: conversationId,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: `/api/ai/chat?conversationId=${conversationId}`,
        credentials: "include",
      }),
      experimental_throttle: 50,
      onFinish: ({ messages: updatedMessages, isError }) => {
        if (isError) {
          toast.error(`${TIP_NAME} could not finish that response.`);
          queryClient.invalidateQueries({ queryKey: queryKeys.usage });
          return;
        }

        queryClient.setQueryData(
          queryKeys.chatConversation(conversationId),
          (
            current:
              | {
                  conversation: {
                    id: string;
                    title: string;
                    createdAt: string;
                    updatedAt: string;
                    messages: ChatMessageRecord[];
                  };
                }
              | undefined,
          ) => {
            if (!current?.conversation) {
              return current;
            }

            return {
              conversation: {
                ...current.conversation,
                messages: updatedMessages.map((message) => ({
                  id: message.id,
                  role: message.role,
                  content: message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n"),
                  parts: message.parts,
                  createdAt: new Date().toISOString(),
                })),
                updatedAt: new Date().toISOString(),
              },
            };
          },
        );

        queryClient.invalidateQueries({
          queryKey: queryKeys.chatConversations,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      },
      onError: (chatError) => {
        toast.error(chatError.message || "Failed to send message");
        queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      },
    });

  useEffect(() => {
    const pending = consumePendingChatMessage(conversationId);

    if (!pending?.text && !pending?.files?.length) {
      return;
    }

    void sendMessage({
      text: pending.text || "",
      files: pending.files as FileUIPart[],
    });
  }, [conversationId, sendMessage]);

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error("[CHAT] Client error:", error);
  }, [error]);

  const disabledReason = !canChat
    ? `You have used ${chatDailyUsage?.used ?? 0} of ${
        chatDailyUsage?.limit ?? 0
      } daily messages. You can keep reading your conversations until the timer resets.`
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 bg-gradient-to-b from-background via-background to-muted/20">
        <ChatMessageList
          emptyState={
            <div className="px-4 py-10 text-center text-muted-foreground">
              This conversation is empty. Ask {TIP_NAME} anything to get
              started.
            </div>
          }
          messages={messages}
          className="mx-auto max-w-3xl"
          onRetry={() => void regenerate()}
          status={status}
        />
        <ChatRatingBanner
          conversationId={conversationId}
          messages={messages}
          status={status}
        />
      </div>

      <div className="border-t bg-background/95 px-4 py-4 backdrop-blur md:px-6">
        <Suggestions className="mx-auto mb-4 flex max-w-3xl flex-wrap gap-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <Suggestion
              key={suggestion}
              onClick={() => void sendMessage({ text: suggestion })}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
        <ChatComposer
          disabled={!canChat}
          disabledReason={disabledReason}
          onSubmit={async (message) => {
            if (!message.text?.trim() && !message.files?.length) {
              return;
            }

            await sendMessage({
              text: message.text,
              files: message.files as FileUIPart[],
            });
          }}
          className="mx-auto max-w-3xl"
          status={status}
        />
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

  if (isPending) {
    return (
      <div
        className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 px-4 py-6"
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
        conversationId={conversationId}
        initialMessages={initialMessages}
        key={conversationId}
      />
    </div>
  );
}
