import { generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import { getCached, setCached } from "./cache";
import { getTaskConfig } from "./registry";
import { google } from "./instances";

const gemini = google("gemini-2.5-flash");
const TIMEOUT_MS = 10_000;

export interface GenerateOptions<T> {
  task: string;
  schema: z.ZodType<T>;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  system?: string;
  modelOptions?: Record<string, unknown>;
}

export interface StreamChatOptions {
  task: string;
  system?: string;
  messages: Array<
    { role: "user" | "assistant" | "system" | "tool"; content: string }
  >;
  tools?: Record<string, unknown>;
  onFinish?: (result: { text: string; usage: unknown }) => void;
}

export interface TextGenOptions {
  task: string;
  prompt?: string;
  messages?: Array<
    { role: "user" | "assistant" | "system"; content: string }
  >;
  system?: string;
  modelOptions?: Record<string, unknown>;
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
  const cacheKey = opts.prompt ?? JSON.stringify(opts.messages);
  const config = getTaskConfig(opts.task);

  if (config.cacheTtlMs && config.cacheTtlMs > 0) {
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

  if (config.cacheTtlMs && config.cacheTtlMs > 0) {
    setCached(opts.task, cacheKey, result.object, config.cacheTtlMs);
  }

  return { object: result.object };
}

export async function streamChat(opts: StreamChatOptions) {
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
  const cacheKey = opts.prompt ?? JSON.stringify(opts.messages);
  const config = getTaskConfig(opts.task);

  if (config.cacheTtlMs && config.cacheTtlMs > 0) {
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

  if (config.cacheTtlMs && config.cacheTtlMs > 0) {
    setCached(opts.task, cacheKey, result.object, config.cacheTtlMs);
  }

  return { object: result.object };
}

export async function generateTextCritical(opts: TextGenOptions) {
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
