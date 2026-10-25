"use client";

import type { UIMessage } from "ai";
import { ArrowUpRightIcon } from "lucide-react";

/** Read the chips from the one silent tool that produced them. */
export function suggestionsFromParts(parts: UIMessage["parts"]): string[] {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index] as {
      type?: string;
      state?: string;
      output?: { questions?: unknown };
    };
    if (part.type !== "tool-suggestReplies") continue;
    if (part.state !== "output-available") return [];
    const questions = part.output?.questions;
    if (!Array.isArray(questions)) return [];
    return questions.filter(
      (question): question is string =>
        typeof question === "string" && question.trim().length > 0,
    );
  }
  return [];
}

/**
 * Two or three questions in the student's own voice. A tap sends the stored
 * text verbatim, and the arrow makes it read as an action rather than a field.
 */
export function SuggestedReplies({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (question: string) => void;
}) {
  if (questions.length === 0) return null;

  return (
    <div className="flex w-full flex-wrap gap-2">
      {questions.map((question) => (
        <button
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border bg-background px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={question}
          onClick={() => onSelect(question)}
          type="button"
        >
          <span className="min-w-0 break-words">{question}</span>
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </button>
      ))}
    </div>
  );
}
