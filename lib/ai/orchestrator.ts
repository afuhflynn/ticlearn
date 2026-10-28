import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  streamText,
  type UIMessage,
} from "ai";
import type { z } from "zod";
import { type CacheKeyInput, withCache } from "@/lib/cache";
import { noteColdStart } from "@/lib/cache/cold-start";
import {
  markProbeDone,
  markProbeStart,
  recordSuccess,
  recordTransportFailure,
  splitChain,
} from "./breaker";
import {
  CHAIN_DEADLINE_MS,
  CHAIN_STREAM_DEADLINE_MS,
  chainModel,
  chainMuse,
  headFailArmed,
  isFailFastError,
  isTransportError,
  MUSE_PER_LEG_TIMEOUT_MS,
  perAttemptBudget,
  withDeadline,
} from "./chain";
import { DEFAULT_USD_TO_XAF_RATE, MUSE_COST_PER_CALL_XAF } from "./pricing";
import { getTaskConfig, resolveChain } from "./registry";
import { logUsage, usageFromResult } from "./usage";

/**
 * Tasks that try Muse Spark 1.3 (Meta Model API) first, then fall through to
 * the OpenRouter chain. Muse handles non-streaming `generate` calls natively.
 * For streaming (`streamChat`), Muse responds with a single buffered chunk
 * because it has no streaming endpoint; OpenRouter provides real-time streaming
 * as the fallback.
 */
/** The Muse model ID used as the primary attempt for chat. */
const MUSE_PRIMARY_MODEL = "muse-spark-1.3";

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

/**
 * True when any message in the thread carries an image part. Used to decide
 * whether to route to the multimodal chain first or the text-only chain.
 */
function hasImageParts(messages: Array<{ content: unknown }>): boolean {
  for (const message of messages) {
    const content = message.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          (part as { type?: unknown }).type === "image"
        ) {
          return true;
        }
      }
    }
  }
  return false;
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

/**
 * The cache key for one generation. The chain is resolved first, because an
 * environment override can change which model answers, and the parameters and
 * the prompt identity travel with it so a change to any of them makes a new key.
 */
function generationKey<T>(
  opts: GenerateOptions<T>,
  chain: string[],
): CacheKeyInput {
  return {
    chain,
    prompt: opts.prompt ?? JSON.stringify(opts.messages ?? []),
    params: {
      ...(opts.promptRef ? { ref: opts.promptRef } : {}),
      system: opts.system ?? null,
      modelOptions: opts.modelOptions ?? null,
    },
  };
}

export async function generate<T>(
  opts: GenerateOptions<T>,
): Promise<{ object: T; modelId: string; fromCache: boolean }> {
  const config = getTaskConfig(opts.task);
  const ttlMs = opts.cacheTtlMs ?? config.cacheTtlMs ?? 0;
  logPromptUse(opts.task, opts.promptRef);
  // Count every request toward the instance warm up, not just cache hits. A
  // cold start with an empty memory layer is mostly misses, so counting only
  // hits left servedSinceLoad stuck at zero and mislabeled later hits as cold.
  const cold = noteColdStart();

  // A zero time to live means never cache. Grading sits here on purpose.
  if (ttlMs <= 0) {
    const produced = await runGenerate(opts, cold);
    return { ...produced, fromCache: false };
  }

  const chain = resolveChain(opts.task);
  const { value, fromCache } = await withCache<{ object: T; modelId: string }>(
    opts.task,
    generationKey(opts, chain),
    ttlMs,
    () => runGenerate(opts, cold),
  );

  // A miss already logged its own row from inside the chain walk. Only a hit
  // needs a row of its own, because no model ran and nothing else would record
  // that the call happened. That row is also how the hit rate is read, so one
  // row per call is the whole contract.
  if (fromCache) {
    void logUsage({
      userId: opts.userId ?? null,
      task: opts.task,
      modelId: "cache",
      cacheHit: true,
      cacheNamespace: opts.task,
      coldStart: cold,
      promptRef: opts.promptRef,
    }).catch(() => {});
  }

  return {
    object: value.object,
    modelId: fromCache ? "cache" : value.modelId,
    fromCache,
  };
}

/** The chain walk itself, with no cache anywhere near it. */
async function runGenerate<T>(
  opts: GenerateOptions<T>,
  coldStart: boolean,
): Promise<{ object: T; modelId: string }> {
  const config = getTaskConfig(opts.task);
  const chain = resolveChain(opts.task);

  // Muse task: try Meta or Baseten first, then fall through to OpenRouter.
  if (config.provider === "meta" || config.provider === "baseten") {
    try {
      return await runGenerateMuse(opts, chain[0], coldStart);
    } catch (_museError) {
      // Muse failed or is not configured; fall through to OpenRouter chain.
    }
  }

  const { runnable } = await splitChain(chain);
  if (runnable.length === 0) {
    await logUsage({
      userId: opts.userId ?? null,
      task: opts.task,
      modelId: chain[0] ?? "none",
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: CHAIN_DEADLINE_MS,
      errorCode: "all_open",
      promptRef: opts.promptRef,
      coldStart,
    }).catch(() => {});
    throw friendlyDown(opts.task, [
      { model: "all", error: "All models are in cooldown." },
    ]);
  }
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
        coldStart,
      });
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
    coldStart,
  });
  throw friendlyDown(opts.task, modelErrors);
}

/**
 * Single Muse call with a per-leg timeout. No breaker, no chain walk: one
 * model, one attempt. On any failure the error propagates so runGenerate can
 * fall through to the OpenRouter chain.
 */
async function runGenerateMuse<T>(
  opts: GenerateOptions<T>,
  modelId: string,
  coldStart: boolean,
): Promise<{ object: T; modelId: string }> {
  const started = Date.now();
  const params = callParams(opts.modelOptions);
  const result = await withDeadline(MUSE_PER_LEG_TIMEOUT_MS, (signal) =>
    generateObject({
      model: chainMuse(modelId),
      schema: opts.schema,
      prompt: opts.prompt,
      messages: opts.messages as never,
      system: opts.system,
      timeout: MUSE_PER_LEG_TIMEOUT_MS,
      maxRetries: 0,
      abortSignal: signal,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      ...params.rest,
    }),
  );
  const parsed = usageFromResult(result as { usage?: unknown }, modelId);
  const rate = DEFAULT_USD_TO_XAF_RATE;
  const costUsd = MUSE_COST_PER_CALL_XAF / rate;
  await logUsage({
    userId: opts.userId ?? null,
    task: opts.task,
    modelId,
    promptTokens: parsed.promptTokens,
    completionTokens: parsed.completionTokens,
    costUsd,
    latencyMs: Date.now() - started,
    promptRef: opts.promptRef,
    coldStart,
  });
  return { object: result.object, modelId };
}

/**
 * Single Muse text generation for streaming tasks. Muse has no streaming
 * endpoint, so the complete response is buffered and emitted as a single
 * chunk. On any failure the error propagates so streamChat can fall through
 * to the OpenRouter chain (which provides real-time streaming).
 */
async function runGenerateMuseStream(
  opts: StreamChatOptions,
  modelId: string,
  coldStart: boolean,
): Promise<StreamChatResult> {
  const started = Date.now();
  const streamParams = callParams(opts.modelOptions);
  const result = await withDeadline(MUSE_PER_LEG_TIMEOUT_MS, (signal) =>
    generateText({
      model: chainMuse(modelId),
      system: opts.system,
      messages: opts.messages as never,
      tools: opts.tools as never,
      timeout: MUSE_PER_LEG_TIMEOUT_MS,
      maxRetries: 0,
      abortSignal: signal,
      temperature: streamParams.temperature,
      maxOutputTokens: streamParams.maxOutputTokens,
      ...streamParams.rest,
    }),
  );

  const text = typeof result.text === "string" ? result.text : "";
  if (!text.trim()) {
    throw new Error("Muse returned an empty response");
  }
  const parsed = usageFromResult(result as { usage?: unknown }, modelId);
  const rate = DEFAULT_USD_TO_XAF_RATE;
  const costUsd = MUSE_COST_PER_CALL_XAF / rate;
  await logUsage({
    userId: opts.userId ?? null,
    task: opts.task,
    modelId,
    promptTokens: parsed.promptTokens,
    completionTokens: parsed.completionTokens,
    costUsd,
    latencyMs: Date.now() - started,
    promptRef: opts.promptRef,
    coldStart,
  }).catch(() => {});

  const textStream = (async function* () {
    yield text;
  })();

  const responseMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text }],
  };

  return {
    textStream,
    toUIMessageStreamResponse: (handlers) => {
      const { onError, onFinish, originalMessages } = handlers;
      const stream = createUIMessageStream({
        originalMessages: originalMessages as UIMessage[] | undefined,
        onError,
        onFinish: onFinish
          ? (event) => {
              onFinish({
                finishReason: event.finishReason ?? "stop",
                isAborted: event.isAborted ?? false,
                responseMessage: event.responseMessage ?? responseMessage,
              });
            }
          : undefined,
        execute: ({ writer }) => {
          writer.write({ type: "start", messageId: responseMessage.id });
          const textId = crypto.randomUUID();
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: text });
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "finish" });
        },
      });
      return createUIMessageStreamResponse({ stream });
    },
  };
}

function logPromptUse(task: string, ref?: PromptRef): void {
  if (ref) {
    console.debug(
      `[ai] ${task} prompt ${ref.name} v${ref.version} ${ref.model}`,
    );
  }
}

type StreamChatResult = {
  textStream: AsyncIterable<string>;
  toUIMessageStreamResponse: (handlers: {
    onError?: (err: unknown) => string;
    onFinish?: (
      result: {
        finishReason?: string;
        isAborted?: boolean;
        responseMessage: UIMessage;
      },
    ) => void;
    [key: string]: unknown;
  }) => Response;
};

export async function streamChat(opts: StreamChatOptions): Promise<StreamChatResult> {
  logPromptUse(opts.task, opts.promptRef);
  const cold = noteColdStart();

  // Muse-only for chat: no OpenRouter fallback. Muse buffers the whole
  // response, so there are no mid-stream cutoffs or partial answers.
  if (opts.task === "fast_chat") {
    try {
      return await runGenerateMuseStream(opts, MUSE_PRIMARY_MODEL, cold);
    } catch (_museError) {
      throw friendlyDown(opts.task, [
        { model: MUSE_PRIMARY_MODEL, error: errorMessage(_museError) },
      ]);
    }
  }

  const multimodal = hasImageParts(opts.messages);
  const chain = resolveChain(opts.task, { multimodal });
  const { runnable } = await splitChain(chain);
  const tried: Array<{ model: string; error: string }> = [];
  let lastError: unknown = null;

  if (runnable.length === 0) {
    await logUsage({
      userId: opts.userId ?? null,
      task: opts.task,
      modelId: chain[0] ?? "none",
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      latencyMs: CHAIN_STREAM_DEADLINE_MS,
      errorCode: "all_open",
      promptRef: opts.promptRef,
      coldStart: cold,
    }).catch(() => {});
    throw friendlyDown(opts.task, [
      { model: "all", error: "All models are in cooldown." },
    ]);
  }

  for (const modelId of runnable) {
    markProbeStart(modelId);
    try {
      const started = Date.now();
      const streamParams = callParams(opts.modelOptions);
      let streamError: unknown = null;
      const remainingMs = CHAIN_STREAM_DEADLINE_MS - (Date.now() - started);
      if (remainingMs <= 500) break;
      const attemptBudget = Math.max(2000, Math.min(remainingMs, 15000));
      const result = streamText({
        model: chainModel(modelId),
        system: opts.system,
        messages: opts.messages as never,
        tools: opts.tools as never,
        timeout: attemptBudget,
        maxRetries: 0,
        temperature: streamParams.temperature,
        maxOutputTokens: streamParams.maxOutputTokens,
        ...streamParams.rest,
        onError: ({ error }) => {
          streamError = error;
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
            coldStart: cold,
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
            coldStart: cold,
          });
          opts.onFinish?.({ text: finish.text, usage: finish.usage });
        },
      });

      // streamText returns before the provider is called, so a fault can only
      // surface while the stream is read. Peek the first text delta: a model
      // that cannot produce one fails here, before we commit to it. Wrap the
      // probe in the attempt deadline so a slow model cannot consume the whole
      // Vercel budget before we fall through to the next model.
      const firstTextStream = await withDeadline(attemptBudget, () =>
        probeFirstToken(result),
      );
      if (streamError) throw streamError;
      if (!firstTextStream) {
        throw new Error("stream ended before first token");
      }

      // The probe consumes the first text delta. Some AI SDK result objects
      // expose textStream through a getter, so assigning to the result is not
      // reliable. Return a proxy that puts the consumed first delta back while
      // preserving every other SDK method and property.
      return new Proxy(result, {
        get(target, property, receiver) {
          if (property === "textStream") return firstTextStream;
          return Reflect.get(target, property, receiver);
        },
      });
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
}): Promise<AsyncIterable<string> | null> {
  const iterator = result.textStream[Symbol.asyncIterator]();
  const first = await iterator.next();
  if (first.done) {
    const abort = (result as unknown as { consumeStream?: () => Promise<void> })
      .consumeStream;
    if (typeof abort === "function") await abort.call(result);
    return null;
  }
  const preserved = (async function* () {
    yield first.value;
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      yield next.value;
    }
  })();
  return preserved;
}

export async function generateTextWithFallback(opts: TextGenOptions) {
  logPromptUse(opts.task, opts.promptRef);
  const cold = noteColdStart();
  const chain = resolveChain(opts.task);
  const { runnable } = await splitChain(chain);
  if (runnable.length === 0)
    throw friendlyDown(opts.task, [
      { model: "all", error: "All models are in cooldown." },
    ]);
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
        coldStart: cold,
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
    coldStart: cold,
  });
  throw friendlyDown(opts.task, modelErrors);
}

/**
 * Agentic loop. The model can call tools, observe results, and decide again,
 * up to maxSteps (default 5, hard cap 10). Used for deep reasoning, research,
 * and multi step tasks. Each step is logged per model. Transport failures fall
 * through the chain; schema errors fail fast.
 */
export interface AgentOptions {
  task: string;
  system?: string;
  messages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    content: unknown;
  }>;
  tools: Record<string, unknown>;
  maxSteps?: number;
  modelOptions?: Record<string, unknown>;
  userId?: string | null;
  onStep?: (step: {
    step: number;
    modelId: string;
    toolCalls: Array<{ name: string; args: unknown }>;
  }) => void;
}

export interface AgentResult {
  text: string;
  steps: number;
  modelId: string;
}

export async function agent(opts: AgentOptions): Promise<AgentResult> {
  const multimodal = hasImageParts(opts.messages);
  const chain = resolveChain(opts.task, { multimodal });
  const maxSteps = Math.max(1, Math.min(opts.maxSteps ?? 5, 10));
  const { runnable } = await splitChain(chain);
  if (runnable.length === 0) {
    throw friendlyDown(opts.task, [
      { model: "all", error: "All models are in cooldown." },
    ]);
  }

  const deadlineAt = Date.now() + CHAIN_DEADLINE_MS;
  const modelErrors: Array<{ model: string; error: string }> = [];
  const failHeadOnce = headFailArmed() && process.env.NODE_ENV !== "production";

  const messages = [...opts.messages];

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

      for (let step = 0; step < maxSteps; step += 1) {
        const params = callParams(opts.modelOptions);
        const result = await withDeadline(budget, (signal) =>
          generateText({
            model: chainModel(modelId),
            system: opts.system,
            messages: messages as never,
            tools: opts.tools as never,
            toolChoice: step === 0 ? "required" : "auto",
            timeout: budget,
            maxRetries: 0,
            abortSignal: signal,
            temperature: params.temperature,
            maxOutputTokens: params.maxOutputTokens,
            ...params.rest,
          }),
        );

        const toolCalls =
          (
            result as unknown as {
              toolCalls?: Array<{ name: string; args: unknown; id: string }>;
            }
          )?.toolCalls ?? [];

        if (toolCalls.length === 0) {
          await recordSuccess(modelId);
          await logUsage({
            userId: opts.userId ?? null,
            task: opts.task,
            modelId,
            promptTokens: 0,
            completionTokens: 0,
            costUsd: 0,
            latencyMs: Date.now() - started,
            promptRef: undefined,
            coldStart: false,
          }).catch(() => {});
          return {
            text: result.text,
            steps: step + 1,
            modelId,
          };
        }

        // Assistant turn with tool calls
        messages.push({
          role: "assistant",
          content: result.text ?? "",
          toolCalls,
        } as never);

        // Execute each tool and append results
        const toolFns = opts.tools as Record<
          string,
          (args: unknown) => Promise<unknown>
        >;
        for (const toolCall of toolCalls) {
          let toolResult: unknown;
          try {
            const fn = toolFns[toolCall.name];
            toolResult = fn
              ? await fn(toolCall.args)
              : { error: `Unknown tool: ${toolCall.name}` };
          } catch (toolError) {
            toolResult = {
              error:
                toolError instanceof Error
                  ? toolError.message
                  : String(toolError),
            };
          }
          messages.push({
            role: "tool",
            toolCallId: toolCall.id,
            content: JSON.stringify(toolResult),
          } as never);
        }

        opts.onStep?.({
          step: step + 1,
          modelId,
          toolCalls: toolCalls.map((tc) => ({ name: tc.name, args: tc.args })),
        });
      }

      // Max steps reached without a final answer
      throw new Error(
        `Agent reached max ${maxSteps} steps without a final answer`,
      );
    } catch (error) {
      if (isFailFastError(error)) {
        throw error;
      }
      modelErrors.push({ model: modelId, error: errorMessage(error) });
      if (isTransportError(error)) {
        await recordTransportFailure(modelId);
        continue;
      }
      console.error(
        `[agent] unclassified error on ${modelId} for task ${opts.task}:`,
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
    promptRef: undefined,
    coldStart: false,
  }).catch(() => {});
  throw friendlyDown(opts.task, modelErrors);
}

// ── Aliases for call sites (same walk, clear names) ───────────────────────────

export const generateCritical = generate;

export const generateTextCritical = generateTextWithFallback;

export { OrchestratorError };
