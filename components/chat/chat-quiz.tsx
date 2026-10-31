"use client";

import type { UIMessage } from "ai";
import { useMemo } from "react";
import { QuizRunner } from "@/components/chat/quiz-runner";

type QuizOutput = {
  ok?: boolean;
  reason?: string;
  noteId?: string | null;
  noteTitle?: string | null;
};

type QuizPart = {
  toolCallId?: string;
  toolName?: string;
  input?: { noteId?: string; noteTitle?: string };
  output?: unknown;
  state?: string;
};

/** Static parts carry the tool name in the type (`tool-startQuiz`);
 *  only dynamic parts carry a separate toolName field. */
function quizNameOf(part: { type: string }, tool?: QuizPart): string | null {
  if (part.type === "dynamic-tool") return tool?.toolName ?? null;
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return null;
}

function quizOutputsFromParts(
  messageParts: UIMessage["parts"],
): { part: QuizPart; output: QuizOutput }[] {
  const out: { part: QuizPart; output: QuizOutput }[] = [];
  for (const part of messageParts ?? []) {
    if (typeof part !== "object" || part === null || !("type" in part)) {
      continue;
    }
    const typed = part as { type: unknown };
    if (typeof typed.type !== "string") continue;
    if (typed.type !== "dynamic-tool" && !typed.type.startsWith("tool-")) {
      continue;
    }
    const tool = part as QuizPart & { toolName?: string };
    if (quizNameOf({ type: typed.type }, tool) !== "startQuiz") continue;
    const output = tool.output as QuizOutput | undefined;
    if (output && typeof output.ok === "boolean") {
      out.push({ part: tool, output });
    }
  }
  return out.slice(0, 1);
}

/**
 * The in chat quiz card. The model opens it through the startQuiz tool once
 * setup resolves; the runner below owns setup, count, questions, marking,
 * and correction, so the thread never carries a free typed quiz beside it.
 * One ask mounts one runner; a new ask means a new tool call on a new turn.
 */
export function ChatQuiz({
  conversationId,
  message,
}: {
  conversationId: string;
  message: UIMessage;
}) {
  const runs = useMemo(
    () => quizOutputsFromParts(message.parts),
    [message.parts],
  );
  if (runs.length === 0) return null;
  const run = runs[0];
  if (!run) return null;
  if (!run.output.ok) {
    return (
      <div className="mx-auto w-full max-w-[48rem] px-4">
        <p className="text-sm text-muted-foreground">
          The quiz could not start on that note. Name the topic again and it
          will be set up.
        </p>
      </div>
    );
  }
  return (
    <div className="w-full">
      <span className="sr-only">Practice quiz</span>
      <QuizRunner
        conversationId={conversationId}
        noteId={run.output.noteId ?? null}
        noteTitle={run.output.noteTitle ?? null}
      />
    </div>
  );
}
