import {
  generateObject,
  generateText,
  streamText,
  type LanguageModel,
} from "ai";
import type { z } from "zod";
import { getCached, setCached } from "./cache";
import { getTaskConfig } from "./registry";
import { openai } from "./instances";

const gpt = openai("gpt-5.5");

// ── Model health cache ──────────────────────────────────────────────────────
const MODEL_CACHE_TTL = 5 * 60 * 1000;
const DEAD_CACHE_TTL = 30 * 1000;
const TIMEOUT_MS = 10_000;

const workingModelCache = new Map<
  string,
  { model: LanguageModel; expiresAt: number }
>();

const deadModelCache = new Map<
  string,
  Array<{ modelId: string; expiresAt: number }>
>();

function getCachedWorkingModel(task: string): LanguageModel | null {
  const entry = workingModelCache.get(task);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    workingModelCache.delete(task);
    return null;
  }
  return entry.model;
}

function setCachedWorkingModel(task: string, model: LanguageModel): void {
  workingModelCache.set(task, {
    model,
    expiresAt: Date.now() + MODEL_CACHE_TTL,
  });
}

function isModelDead(task: string, model: LanguageModel): boolean {
  const deadEntries = deadModelCache.get(task);
  if (!deadEntries) return false;
  const mid = modelName(model);
  return deadEntries.some((e) => e.modelId === mid && Date.now() < e.expiresAt);
}

function markModelDead(task: string, model: LanguageModel): void {
  const mid = modelName(model);
  const deadEntries = deadModelCache.get(task) ?? [];
  deadEntries.push({ modelId: mid, expiresAt: Date.now() + DEAD_CACHE_TTL });
  deadModelCache.set(task, deadEntries);
}

function pruneDeadCache(task: string): void {
  const entries = deadModelCache.get(task);
  if (!entries) return;
  const alive = entries.filter((e) => Date.now() < e.expiresAt);
  if (alive.length > 0) deadModelCache.set(task, alive);
  else deadModelCache.delete(task);
}
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateOptions<T> {
  task: string;
  schema: z.ZodType<T>;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  system?: string;
  modelOptions?: Record<string, unknown>;
  chainOverride?: LanguageModel[];
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

function modelName(model: LanguageModel): string {
  try {
    return (model as unknown as { modelId?: string }).modelId || String(model);
  } catch {
    return "unknown";
  }
}

function retryConfig() {
  return { maxRetries: 0 as const, timeout: TIMEOUT_MS };
}

function callGenerateObject<T>(
  model: LanguageModel,
  opts: GenerateOptions<T>,
) {
  return generateObject({
    model,
    schema: opts.schema,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    providerOptions: { google: { structuredOutputs: false } as never },
    ...retryConfig(),
    ...(opts.modelOptions as Record<string, unknown>),
  });
}

function callStreamText(
  model: LanguageModel,
  opts: StreamChatOptions,
) {
  return streamText({
    model,
    system: opts.system,
    messages: opts.messages as never,
    tools: opts.tools as never,
    onFinish: opts.onFinish as never,
    ...retryConfig(),
  });
}

function callGenerateText(
  model: LanguageModel,
  opts: TextGenOptions,
) {
  return generateText({
    model,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    ...retryConfig(),
    ...(opts.modelOptions as Record<string, unknown>),
  });
}

export async function generate<T>(
  opts: GenerateOptions<T>,
): Promise<{ object: T }> {
  const config = getTaskConfig(opts.task);
  const chain = opts.chainOverride ?? config.chain;
  const modelErrors: Array<{ model: string; error: string }> = [];

  const cacheKey = opts.prompt ?? JSON.stringify(opts.messages);

  if (config.cacheTtlMs && config.cacheTtlMs > 0) {
    const cached = getCached(opts.task, cacheKey);
    if (cached) {
      return { object: cached as T };
    }
  }

  pruneDeadCache(opts.task);

  const cachedModel = getCachedWorkingModel(opts.task);
  if (cachedModel && !isModelDead(opts.task, cachedModel)) {
    try {
      const result = await callGenerateObject(cachedModel, opts);

      if (config.cacheTtlMs && config.cacheTtlMs > 0) {
        setCached(opts.task, cacheKey, result.object, config.cacheTtlMs);
      }

      return { object: result.object };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Orchestrator] Cached model ${modelName(cachedModel)} failed for task "${opts.task}": ${msg}. Falling back...`,
      );
      markModelDead(opts.task, cachedModel);
    }
  }

  for (const model of chain) {
    if (isModelDead(opts.task, model)) continue;

    try {
      const result = await callGenerateObject(model, opts);

      setCachedWorkingModel(opts.task, model);

      if (config.cacheTtlMs && config.cacheTtlMs > 0) {
        setCached(opts.task, cacheKey, result.object, config.cacheTtlMs);
      }

      return { object: result.object };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
      markModelDead(opts.task, model);
      console.warn(
        `[Orchestrator] Model ${modelName(model)} failed for task "${opts.task}": ${msg}. Trying next...`,
      );
    }
  }

  throw new OrchestratorError(
    `All ${chain.length} models failed for task "${opts.task}".`,
    opts.task,
    modelErrors,
  );
}

export async function streamChat(opts: StreamChatOptions) {
  const config = getTaskConfig(opts.task);
  const chain = config.chain;
  const modelErrors: Array<{ model: string; error: string }> = [];

  pruneDeadCache(opts.task);

  const cachedModel = getCachedWorkingModel(opts.task);
  if (cachedModel && !isModelDead(opts.task, cachedModel)) {
    try {
      return callStreamText(cachedModel, opts);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Orchestrator] Cached model ${modelName(cachedModel)} failed stream for task "${opts.task}": ${msg}. Falling back...`,
      );
      markModelDead(opts.task, cachedModel);
    }
  }

  for (const model of chain) {
    if (isModelDead(opts.task, model)) continue;

    try {
      const result = callStreamText(model, opts);

      setCachedWorkingModel(opts.task, model);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
      markModelDead(opts.task, model);
      console.warn(
        `[Orchestrator] Model ${modelName(model)} failed stream for task "${opts.task}": ${msg}. Trying next...`,
      );
    }
  }

  throw new OrchestratorError(
    `All ${chain.length} models failed streaming for task "${opts.task}".`,
    opts.task,
    modelErrors,
  );
}

export async function generateTextWithFallback(opts: TextGenOptions) {
  const config = getTaskConfig(opts.task);
  const chain = config.chain;
  const modelErrors: Array<{ model: string; error: string }> = [];

  pruneDeadCache(opts.task);

  const cachedModel = getCachedWorkingModel(opts.task);
  if (cachedModel && !isModelDead(opts.task, cachedModel)) {
    try {
      return await callGenerateText(cachedModel, opts);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Orchestrator] Cached model ${modelName(cachedModel)} failed text gen for task "${opts.task}": ${msg}. Falling back...`,
      );
      markModelDead(opts.task, cachedModel);
    }
  }

  for (const model of chain) {
    if (isModelDead(opts.task, model)) continue;

    try {
      const result = await callGenerateText(model, opts);

      setCachedWorkingModel(opts.task, model);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
      markModelDead(opts.task, model);
      console.warn(
        `[Orchestrator] Model ${modelName(model)} failed text gen for task "${opts.task}": ${msg}. Trying next...`,
      );
    }
  }

  throw new OrchestratorError(
    `All ${chain.length} models failed for task "${opts.task}".`,
    opts.task,
    modelErrors,
  );
}

export { OrchestratorError };

// ── Critical-path functions (OpenAI direct, no fallback chain) ─────────────

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
    model: gpt,
    schema: opts.schema,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    providerOptions: { google: { structuredOutputs: false } as never },
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
    model: gpt,
    prompt: opts.prompt,
    messages: opts.messages as never,
    system: opts.system,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
    ...(opts.modelOptions as Record<string, unknown>),
  });
}

/** Re-exported for use by the chat route (which does its own streamText). */
export function tryCachedModel(
  task: string,
  chain: LanguageModel[],
): { model: LanguageModel; fromCache: boolean } | null {
  pruneDeadCache(task);

  const cachedModel = getCachedWorkingModel(task);
  if (cachedModel && !isModelDead(task, cachedModel)) {
    return { model: cachedModel, fromCache: true };
  }

  for (const model of chain) {
    if (!isModelDead(task, model)) {
      return { model, fromCache: false };
    }
  }

  return null;
}

export function reportModelSuccess(task: string, model: LanguageModel): void {
  setCachedWorkingModel(task, model);
}

export function reportModelFailure(task: string, model: LanguageModel): void {
  markModelDead(task, model);
}
