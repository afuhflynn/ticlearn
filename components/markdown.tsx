"use client";

import { Streamdown } from "streamdown";
import { math } from "@streamdown/math";
import { normalizeMathNotation } from "@/lib/math-format";

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return <Streamdown plugins={{ math }}>{normalizeMathNotation(children)}</Streamdown>;
}
