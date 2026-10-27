"use client";

import type { FileUIPart } from "ai";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AllowanceNotice } from "@/components/chat/allowance-notice";
import { useUsage } from "@/hooks";
import { useCreateConversation } from "@/hooks/useChat";
import { useSession } from "@/lib/auth-client";
import {
  ChatComposer,
  type ChatComposerPrefill,
  type ChatComposerSubmission,
} from "./chat-composer";
import { StarterRows } from "./starter-rows";
import { storePendingChatMessage } from "./pending-message";

export function ChatLanding({
  noteId,
  initialQuestion,
}: {
  noteId?: string | null;
  initialQuestion?: string | null;
}) {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const { chatDailyUsage } = useUsage();
  const { data: session } = useSession();
  const [prefill, setPrefill] = useState<ChatComposerPrefill | undefined>(
    initialQuestion ? { text: initialQuestion, nonce: Date.now() } : undefined,
  );

  const spentAllowance =
    chatDailyUsage !== null &&
    chatDailyUsage.limit !== -1 &&
    chatDailyUsage.remaining <= 0;

  const startConversation = async (submission: ChatComposerSubmission) => {
    if (!submission.text.trim() && submission.files.length === 0) return;

    try {
      const result = await createConversation.mutateAsync({
        noteId: noteId ?? undefined,
      });
      storePendingChatMessage(result.conversation.id, {
        text: submission.text,
        files: submission.files as FileUIPart[],
      });
      router.push(`/chat/${result.conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[48rem] flex-1 flex-col justify-center gap-8 px-4 py-8 md:py-12">
        <div className="space-y-3 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Hello {session?.user.name.split(" ")[0]}, what are we studying
            today?
          </h1>
          {noteId ? (
            <p className="mx-auto inline-flex w-fit items-center rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              Talking about one of your notes
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {spentAllowance ? (
            <AllowanceNotice resetsAt={chatDailyUsage?.resetsAt} />
          ) : (
            <ChatComposer
              draftKey="new"
              onSubmit={startConversation}
              prefill={prefill}
              status="ready"
            />
          )}

          <StarterRows
            onStart={(prompt) =>
              setPrefill({ text: prompt, nonce: Date.now() })
            }
          />
        </div>
      </div>
    </div>
  );
}
