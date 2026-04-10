"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useUsage } from "@/hooks";
import { useCreateConversation } from "@/hooks/useChat";
import { ChatComposer } from "./chat-composer";
import { CHAT_SUGGESTIONS } from "./constants";
import { storePendingChatMessage } from "./pending-message";

export function ChatLanding() {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const { canUseAIChat } = useUsage();

  const startConversation = async (text: string) => {
    try {
      const result = await createConversation.mutateAsync();
      storePendingChatMessage(result.conversation.id, { text });
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-4 py-10 md:px-8">
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
            TiC Study Assistant
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Ask about your notes, quizzes, and study progress.
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Start a new conversation and TiC will pull the right tools when you
            ask about your own learning data.
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl space-y-4">
          <ChatComposer
            disabled={!canUseAIChat}
            disabledReason={
              canUseAIChat
                ? undefined
                : "You can still browse old conversations, but your daily chat allowance is exhausted until the next reset."
            }
            onSubmit={async (message) => {
              if (!message.text?.trim()) {
                return;
              }

              await startConversation(message.text);
            }}
            status="ready"
          />
        </div>

        <Suggestions className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <Suggestion
              key={suggestion}
              onClick={() => startConversation(suggestion)}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
      </div>
    </div>
  );
}
