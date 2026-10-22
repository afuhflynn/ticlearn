"use client";

import { math } from "@streamdown/math";
import { Streamdown } from "streamdown";
import { normalizeMathNotation } from "@/lib/math-format";

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <Streamdown plugins={{ math }}>
      {normalizeMathNotation(children)}
    </Streamdown>
  );
}
