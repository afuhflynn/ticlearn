import { generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import { getCached, setCached } from "./cache";
import { getTaskConfig } from "./registry";
import { google } from "./instances";

const gemini = google("gemini-2.5-flash");
const TIMEOUT_MS = 10_000;

/** Identity of the prompt file behind a call. Traces cache keys and logs. */
export interface PromptRef {
  name: string;
  version: number;
  model: string;
}

export interface GenerateOptions<T> {
  task: string;
  schema: z.ZodType<T>;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  system?: string;
  modelOptions?: Record<string, unknown>;
  /** File values win over the task registry; 0 means never cache. */
  cacheTtlMs?: number;
  promptRef?: PromptRef;
}

export interface StreamChatOptions {
  task: string;
  system?: string;
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: string;
  }>;
  tools?: Record<string, unknown>;
  onFinish?: (result: { text: string; usage: unknown }) => void;
  promptRef?: PromptRef;
}

export interface TextGenOptions {
  task: string;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  system?: string;
  modelOptions?: Record<string, unknown>;
  /** File values win over the task registry; 0 means never cache. */
  cacheTtlMs?: number;
  promptRef?: PromptRef;
}

class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly task: string,
    public readonly modelErrors: Array<{ model: string; error: string }>,
  ) {
    super(message);
    this.name = "OrchestratorError";
  }
}

export async function generate<T>(
  opts: GenerateOptions<T>,
): Promise<{ object: T }> {
  const rawKey = opts.prompt ?? JSON.stringify(opts.messages);
  const cacheKey = opts.promptRef
    ? `${opts.promptRef.name} v${opts.promptRef.version}:${rawKey}`
    : rawKey;
  const config = getTaskConfig(opts.task);
  const ttlMs = opts.cacheTtlMs ?? config.cacheTtlMs ?? 0;
  logPromptUse(opts.task, opts.promptRef);

  if (ttlMs > 0) {
    const cached = getCached(opts.task, cacheKey);
    if (cached) {
      return { object: cached as T };
    }
  }

  const result = await generateObject({
    model: gemini,
    schema: opts.schema,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
    ...(opts.modelOptions as Record<string, unknown>),
  });

  if (ttlMs > 0) {
    setCached(opts.task, cacheKey, result.object, ttlMs);
  }

  return { object: result.object };
}

function logPromptUse(task: string, ref?: PromptRef): void {
  if (ref) {
    console.debug(
      `[ai] ${task} prompt ${ref.name} v${ref.version} ${ref.model}`,
    );
  }
}

export async function streamChat(opts: StreamChatOptions) {
  logPromptUse(opts.task, opts.promptRef);
  return streamText({
    model: gemini,
    system: opts.system,
    messages: opts.messages as never,
    tools: opts.tools as never,
    onFinish: opts.onFinish as never,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  });
}

export async function generateTextWithFallback(opts: TextGenOptions) {
  logPromptUse(opts.task, opts.promptRef);
  return generateText({
    model: gemini,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
    ...(opts.modelOptions as Record<string, unknown>),
  });
}

// ── Aliases for backward compat (identical to above) ────────────────────────

export async function generateCritical<T>(
  opts: GenerateOptions<T>,
): Promise<{ object: T }> {
  const rawKey = opts.prompt ?? JSON.stringify(opts.messages);
  const cacheKey = opts.promptRef
    ? `${opts.promptRef.name} v${opts.promptRef.version}:${rawKey}`
    : rawKey;
  const config = getTaskConfig(opts.task);
  const ttlMs = opts.cacheTtlMs ?? config.cacheTtlMs ?? 0;
  logPromptUse(opts.task, opts.promptRef);

  if (ttlMs > 0) {
    const cached = getCached(opts.task, cacheKey);
    if (cached) {
      return { object: cached as T };
    }
  }

  const result = await generateObject({
    model: gemini,
    schema: opts.schema,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
    ...(opts.modelOptions as Record<string, unknown>),
  });

  if (ttlMs > 0) {
    setCached(opts.task, cacheKey, result.object, ttlMs);
  }

  return { object: result.object };
}

export async function generateTextCritical(opts: TextGenOptions) {
  logPromptUse(opts.task, opts.promptRef);
  return generateText({
    model: gemini,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
    ...(opts.modelOptions as Record<string, unknown>),
  });
}

export { OrchestratorError };
