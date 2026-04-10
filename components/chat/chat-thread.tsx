"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useCheckLimit, useUsage } from "@/hooks";
import { useChatConversation } from "@/hooks/useChat";
import { normalizeStoredParts } from "@/lib/chat-messages";
import { queryKeys } from "@/lib/query-keys";
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

  const { messages, sendMessage, status, error } = useChat<UIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/ai/chat?conversationId=${conversationId}`,
      credentials: "include",
    }),
    experimental_throttle: 50,
    onFinish: ({ messages: updatedMessages, isError }) => {
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

      queryClient.invalidateQueries({ queryKey: queryKeys.chatConversations });
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });

      if (isError) {
        toast.error("TiC could not finish that response.");
      }
    },
    onError: (chatError) => {
      toast.error(chatError.message || "Failed to send message");
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    },
  });

  useEffect(() => {
    const pending = consumePendingChatMessage(conversationId);

    if (!pending?.text) {
      return;
    }

    void sendMessage({ text: pending.text });
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
      <div className="min-h-0 flex-1">
        <ChatMessageList
          emptyState={
            <div className="px-4 py-10 text-center text-muted-foreground">
              This conversation is empty. Ask TiC anything to get started.
            </div>
          }
          messages={messages}
          status={status}
        />
      </div>

      <div className="border-t px-4 py-4 md:px-6">
        <Suggestions className="mb-4 flex flex-wrap gap-2">
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
            if (!message.text?.trim()) {
              return;
            }

            await sendMessage({ text: message.text });
          }}
          status={status}
        />
      </div>
    </div>
  );
}

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { conversation, messages, isLoading, error } =
    useChatConversation(conversationId);

  const initialMessages = useMemo(
    () =>
      messages.map((message: ChatMessageRecord) => ({
        id: message.id,
        role: message.role as UIMessage["role"],
        parts: normalizeStoredParts(message.parts, message.content),
      })),
    [messages],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="text-xl font-semibold">Conversation unavailable</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          This chat could not be loaded. It may have been deleted or you may no
          longer have access to it.
        </p>
      </div>
    );
  }

  return (
    <ConversationSession
      conversationId={conversationId}
      initialMessages={initialMessages}
      key={conversationId}
    />
  );
}
