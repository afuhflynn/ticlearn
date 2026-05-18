"use client";

import {
  BarChart3,
  FileText,
  ImageIcon,
  Sparkles,
  Zap,
  Shapes,
} from "lucide-react";
import type { FileUIPart } from "ai";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { useUsage } from "@/hooks";
import { useCreateConversation } from "@/hooks/useChat";
import { ChatComposer } from "./chat-composer";
import { CHAT_SUGGESTIONS, QUICK_ACTIONS } from "./constants";
import { storePendingChatMessage } from "./pending-message";
import { useSession } from "@/lib/auth-client";

const actionIcons = {
  notes: FileText,
  progress: BarChart3,
  quiz: Shapes,
  image: ImageIcon,
};

export function ChatLanding() {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const { canUseAIChat } = useUsage();
  const { data: session } = useSession();

  const startConversation = async (text: string) => {
    try {
      const result = await createConversation.mutateAsync();
      storePendingChatMessage(result.conversation.id, { text });
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text?.trim() && !message.files?.length) return;

    try {
      const result = await createConversation.mutateAsync();
      storePendingChatMessage(result.conversation.id, {
        text: message.text || "",
        files: message.files as FileUIPart[],
      });
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-4 py-8 md:px-8 md:py-12">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Hello {session?.user.name.split(" ")[0]}, what's on your mind?
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Start a conversation and TiC will pull the right tools when you ask
            about your own learning data. Upload images or documents to analyze.
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
            onSubmit={handleSubmit}
            status="ready"
          />
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = actionIcons[action.icon];
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => startConversation(action.prompt)}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center transition-all hover:border-primary/50 hover:bg-accent active:scale-[0.97]"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{action.title}</span>
                <span className="line-clamp-2 text-[10px] text-muted-foreground leading-tight">
                  {action.description}
                </span>
              </button>
            );
          })}
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

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Attach images & PDFs
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Web search enabled
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Study context aware
          </span>
        </div>
      </div>
    </div>
  );
}
