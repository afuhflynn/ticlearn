"use client";

import { api, isNetworkError } from "@/lib/api-client";

export type PromptEventName =
  | "limit_hit"
  | "prompt_shown"
  | "prompt_clicked"
  | "prompt_dismissed"
  | "upgrade_start";

export interface PromptEventBody {
  event: PromptEventName;
  surface: "quiz" | "tip" | "note";
  kind?: string;
  used?: number;
  cap?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Record a prompt event without ever blocking study.
 * A network failure waits a short time then tries once more.
 */
export function recordPromptEvent(body: PromptEventBody): void {
  api.mutations.prompts.record(body).catch((error: unknown) => {
    if (!isNetworkError(error)) return;
    window.setTimeout(() => {
      api.mutations.prompts.record(body).catch(() => {});
    }, 3000);
  });
}
