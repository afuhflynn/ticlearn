"use client";

import type { FileUIPart } from "ai";
import { BarChart3, FileText, ImageIcon, Shapes, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { useUsage } from "@/hooks";
import { useCreateConversation } from "@/hooks/useChat";
import { useSession } from "@/lib/auth-client";
import { ChatComposer } from "./chat-composer";
import { CHAT_SUGGESTIONS, QUICK_ACTIONS, TIP_NAME } from "./constants";
import { storePendingChatMessage } from "./pending-message";

const actionIcons = {
  notes: FileText,
  progress: BarChart3,
  quiz: Shapes,
  image: ImageIcon,
};

export function ChatLanding({ noteId }: { noteId?: string | null }) {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const { canUseAIChat } = useUsage();
  const { data: session } = useSession();

  const startConversation = async (text: string) => {
    try {
      const result = await createConversation.mutateAsync({
        noteId: noteId ?? undefined,
      });
      storePendingChatMessage(result.conversation.id, { text });
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text?.trim() && !message.files?.length) return;

    try {
      const result = await createConversation.mutateAsync({
        noteId: noteId ?? undefined,
      });
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
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-8 md:px-8 md:py-12">
        <div className="space-y-4 text-center">
          <div className="mx-auto inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            {TIP_NAME} · your notes, your quizzes, your progress
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Hello {session?.user.name.split(" ")[0]}, let's turn confusion into
            a study move.
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Ask from your learning data, drop a PDF or DOCX, and {TIP_NAME} will
            quote your own notes back to you, then teach you what they mean.
          </p>
          {noteId && (
            <p className="mx-auto inline-flex w-fit items-center rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              Talking about one of your notes
            </p>
          )}
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

        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = actionIcons[action.icon];
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => startConversation(action.prompt)}
                className="flex min-h-32 flex-col items-start gap-2 rounded-2xl border bg-card/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent active:scale-[0.98]"
              >
                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{action.title}</span>
                <span className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
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

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" /> Images, PDFs, DOCX, text & CSV
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
