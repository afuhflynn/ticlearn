import {
  generateObject,
  generateText,
  streamText,
  type LanguageModel,
} from "ai";
import type { z } from "zod";
import { getCached, setCached } from "./cache";
import { getTaskConfig } from "./registry";

export interface GenerateOptions<T> {
  task: string;
  schema: z.ZodType<T>;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  system?: string;
  /** Extra options passed directly to generateObject (temperature, maxTokens, etc.) */
  modelOptions?: Record<string, unknown>;
  /** Override the default chain for this call */
  chainOverride?: LanguageModel[];
}

export interface StreamChatOptions {
  task: string;
  system?: string;
  messages: Array<{ role: "user" | "assistant" | "system" | "tool"; content: string }>;
  tools?: Record<string, unknown>;
  onFinish?: (result: { text: string; usage: unknown }) => void;
}

export interface TextGenOptions {
  task: string;
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
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

  for (const model of chain) {
    try {
      const result = await generateObject({
        model,
        schema: opts.schema,
        prompt: opts.prompt,
        messages: opts.messages as never,
        system: opts.system,
        ...opts.modelOptions,
      });

      if (config.cacheTtlMs && config.cacheTtlMs > 0) {
        setCached(opts.task, cacheKey, result.object, config.cacheTtlMs);
      }

      return { object: result.object };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
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

  for (const model of chain) {
    try {
      return streamText({
        model,
        system: opts.system,
        messages: opts.messages as never,
        tools: opts.tools as never,
        onFinish: opts.onFinish as never,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
      console.warn(
        `[Orchestrator] Model ${modelName(model)} failed streaming for task "${opts.task}": ${msg}. Trying next...`,
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

  for (const model of chain) {
    try {
      return await generateText({
        model,
        prompt: opts.prompt,
        messages: opts.messages as never,
        system: opts.system,
        ...opts.modelOptions,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      modelErrors.push({ model: modelName(model), error: msg });
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
