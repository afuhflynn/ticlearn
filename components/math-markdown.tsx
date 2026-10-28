"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { normalizeMathNotation } from "@/lib/math-format";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

/**
 * The one assistant-output renderer. Every AI-written string the student
 * reads — chat answers excluded, they stream through `MessageResponse` —
 * goes through here so `$...$` and `$$...$$` typeset with KaTeX on every
 * surface: quizzes, attempts, notes, and upload cards.
 *
 * `normalizeMathNotation` runs first so `\(...\)`, `\[...\]` and fenced
 * ```math blocks render exactly like they do in chat. Display equations
 * scroll sideways instead of breaking a 360px phone.
 */
export function MathMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-full wrap-break-word text-sm leading-7 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMathNotation(content)}
      </ReactMarkdown>
    </div>
  );
}
