import { generateObject, generateText, streamText } from "ai";
import type { z } from "zod";
import {
  markProbeDone,
  markProbeStart,
  recordSuccess,
  recordTransportFailure,
  splitChain,
} from "./breaker";
import { getCached, setCached } from "./cache";
import {
  CHAIN_DEADLINE_MS,
  CHAIN_STREAM_DEADLINE_MS,
  chainModel,
  getChain,
  headFailArmed,
  isFailFastError,
  isTransportError,
  perAttemptBudget,
  withDeadline,
} from "./chain";
import { getTaskConfig } from "./registry";
import { logUsage, usageFromResult } from "./usage";

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
  userId?: string | null;
}

export interface StreamChatOptions {
  task: string;
  system?: string;
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: unknown;
  }>;
  tools?: Record<string, unknown>;
  onFinish?: (result: { text: string; usage: unknown }) => void;
  promptRef?: PromptRef;
  userId?: string | null;
  modelOptions?: Record<string, unknown>;
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
  userId?: string | null;
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

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

function callParams(modelOptions?: Record<string, unknown>): {
  temperature?: number;
  maxOutputTokens: number;
  rest: Record<string, unknown>;
} {
  const opts = (modelOptions ?? {}) as Record<string, unknown>;
  const { temperature, maxOutputTokens, maxTokens, ...rest } = opts;
  const cap =
    typeof maxOutputTokens === "number"
      ? maxOutputTokens
      : typeof maxTokens === "number"
        ? maxTokens
        : 2048;
  return {
    temperature: typeof temperature === "number" ? temperature : undefined,
    maxOutputTokens: cap,
    rest,
  };
}

function friendlyDown(
  task: string,
  modelErrors: Array<{ model: string; error: string }>,
): OrchestratorError {
  return new OrchestratorError(
    "AI help is briefly unavailable. Please try again in a moment.",
    task,
    modelErrors,
  );
}

export async function generate<T>(
  opts: GenerateOptions<T>,
): Promise<{ object: T; modelId: string }> {
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
      return { object: cached as T, modelId: "cache" };
    }
  }

  const chain = getChain();
  const { runnable } = await splitChain(chain);
  const deadlineAt = Date.now() + CHAIN_DEADLINE_MS;
  const modelErrors: Array<{ model: string; error: string }> = [];
  const failHeadOnce = headFailArmed() && process.env.NODE_ENV !== "production";

  for (let index = 0; index < runnable.length; index += 1) {
    const modelId = runnable[index];
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 500) break;
    const budget = perAttemptBudget(remainingMs, runnable.length - index);
    markProbeStart(modelId);
    const started = Date.now();
    try {
      if (failHeadOnce && index === 0) {
        const forced = new Error("Forced head failure for fallback proof");
        forced.name = "TimeoutError";
        throw forced;
      }
      const params = callParams(opts.modelOptions);
      const result = await withDeadline(budget, (signal) =>
        generateObject({
          model: chainModel(modelId),
          schema: opts.schema,
          prompt: opts.prompt,
          messages: opts.messages as never,
          system: opts.system,
          timeout: budget,
          maxRetries: 0,
          abortSignal: signal,
          temperature: params.temperature,
          maxOutputTokens: params.maxOutputTokens,
          ...params.rest,
        }),
      );
      await recordSuccess(modelId);
      const parsed = usageFromResult(result as { usage?: unknown }, modelId);
      await logUsage({
        userId: opts.userId ?? null,
        task: opts.task,
        modelId,
        promptTokens: parsed.promptTokens,
        completionTokens: parsed.completionTokens,
        costUsd: parsed.costUsd,
        latencyMs: Date.now() - started,
        promptRef: opts.promptRef,
      });
      if (ttlMs > 0) {
        setCached(opts.task, cacheKey, result.object, ttlMs);
      }
      return { object: result.object, modelId };
    } catch (error) {
      if (isFailFastError(error)) {
        throw error;
      }
      modelErrors.push({ model: modelId, error: errorMessage(error) });
      if (isTransportError(error)) {
        await recordTransportFailure(modelId);
        continue;
      }
      // Unclassified: a bug in our own code, not a model fault. Record it
      // loudly but never park a healthy model behind it.
      console.error(
        `[chain] unclassified error on ${modelId} for task ${opts.task}:`,
        error,
      );
    } finally {
      markProbeDone(modelId);
    }
  }

  await logUsage({
    userId: opts.userId ?? null,
    task: opts.task,
    modelId: runnable[0] ?? chain[0] ?? "none",
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    latencyMs: CHAIN_DEADLINE_MS,
    errorCode: runnable.length === 0 ? "all_open" : "all_failed",
    promptRef: opts.promptRef,
  });
  throw friendlyDown(opts.task, modelErrors);
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
  const chain = getChain();
  const { runnable } = await splitChain(chain);
  const tried: Array<{ model: string; error: string }> = [];
  let lastError: unknown = null;

  for (const modelId of runnable.length > 0 ? runnable : chain) {
    markProbeStart(modelId);
    try {
      const started = Date.now();
      const streamParams = callParams(opts.modelOptions);
      let streamError: unknown = null;
      const result = streamText({
        model: chainModel(modelId),
        system: opts.system,
        messages: opts.messages as never,
        tools: opts.tools as never,
        timeout: CHAIN_STREAM_DEADLINE_MS,
        maxRetries: 0,
        temperature: streamParams.temperature,
        maxOutputTokens: streamParams.maxOutputTokens,
        ...streamParams.rest,
        onError: ({ error }) => {
          streamError = error;
          void recordTransportFailure(modelId);
          void logUsage({
            userId: opts.userId ?? null,
            task: opts.task,
            modelId,
            promptTokens: 0,
            completionTokens: 0,
            costUsd: 0,
            latencyMs: Date.now() - started,
            errorCode: "stream_error",
            promptRef: opts.promptRef,
          });
        },
        onFinish: (finish) => {
          const parsed = usageFromResult(
            finish as { usage?: unknown },
            modelId,
          );
          void recordSuccess(modelId);
          void logUsage({
            userId: opts.userId ?? null,
            task: opts.task,
            modelId,
            promptTokens: parsed.promptTokens,
            completionTokens: parsed.completionTokens,
            costUsd: parsed.costUsd,
            latencyMs: Date.now() - started,
            promptRef: opts.promptRef,
          });
          opts.onFinish?.({ text: finish.text, usage: finish.usage });
        },
      });

      // streamText returns before the provider is called, so a fault can only
      // surface while the stream is read. Peek the first text delta: a model
      // that cannot produce one fails here, before we commit to it.
      await probeFirstToken(result);
      if (streamError) throw streamError;
      return result;
    } catch (error) {
      lastError = error;
      if (isFailFastError(error)) throw error;
      if (!isTransportError(error)) {
        tried.push({ model: modelId, error: errorMessage(error) });
        continue;
      }
      await recordTransportFailure(modelId);
      tried.push({ model: modelId, error: errorMessage(error) });
    } finally {
      markProbeDone(modelId);
    }
  }

  throw friendlyDown(
    opts.task,
    tried.length > 0
      ? tried
      : [{ model: "none", error: errorMessage(lastError) }],
  );
}

/** Reads one text delta to prove the model is actually answering. */
async function probeFirstToken(result: {
  textStream: AsyncIterable<string>;
}): Promise<void> {
  const iterator = result.textStream[Symbol.asyncIterator]();
  const first = await iterator.next();
  if (first.done) {
    const abort = (result as unknown as { consumeStream?: () => Promise<void> })
      .consumeStream;
    if (typeof abort === "function") await abort.call(result);
    return;
  }
  await iterator.return?.();
}

export async function generateTextWithFallback(opts: TextGenOptions) {
  logPromptUse(opts.task, opts.promptRef);
  const chain = getChain();
  const { runnable } = await splitChain(chain);
  const deadlineAt = Date.now() + CHAIN_DEADLINE_MS;
  const modelErrors: Array<{ model: string; error: string }> = [];
  const failHeadOnce = headFailArmed() && process.env.NODE_ENV !== "production";

  for (let index = 0; index < runnable.length; index += 1) {
    const modelId = runnable[index];
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 500) break;
    const budget = perAttemptBudget(remainingMs, runnable.length - index);
    markProbeStart(modelId);
    const started = Date.now();
    try {
      if (failHeadOnce && index === 0) {
        const forced = new Error("Forced head failure for fallback proof");
        forced.name = "TimeoutError";
        throw forced;
      }
      const params = callParams(opts.modelOptions);
      const result = await withDeadline(budget, (signal) =>
        generateText({
          model: chainModel(modelId),
          prompt: opts.prompt,
          messages: opts.messages as never,
          system: opts.system,
          timeout: budget,
          maxRetries: 0,
          abortSignal: signal,
          temperature: params.temperature,
          maxOutputTokens: params.maxOutputTokens,
          ...params.rest,
        }),
      );
      await recordSuccess(modelId);
      const parsed = usageFromResult(result as { usage?: unknown }, modelId);
      await logUsage({
        userId: opts.userId ?? null,
        task: opts.task,
        modelId,
        promptTokens: parsed.promptTokens,
        completionTokens: parsed.completionTokens,
        costUsd: parsed.costUsd,
        latencyMs: Date.now() - started,
        promptRef: opts.promptRef,
      });
      return result;
    } catch (error) {
      if (isFailFastError(error)) throw error;
      modelErrors.push({ model: modelId, error: errorMessage(error) });
      if (isTransportError(error)) {
        await recordTransportFailure(modelId);
        continue;
      }
      console.error(
        `[chain] unclassified error on ${modelId} for task ${opts.task}:`,
        error,
      );
    } finally {
      markProbeDone(modelId);
    }
  }

  await logUsage({
    userId: opts.userId ?? null,
    task: opts.task,
    modelId: runnable[0] ?? chain[0] ?? "none",
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    latencyMs: CHAIN_DEADLINE_MS,
    errorCode: runnable.length === 0 ? "all_open" : "all_failed",
    promptRef: opts.promptRef,
  });
  throw friendlyDown(opts.task, modelErrors);
}

// ── Aliases for call sites (same walk, clear names) ───────────────────────────

export const generateCritical = generate;

export const generateTextCritical = generateTextWithFallback;

export { OrchestratorError };
