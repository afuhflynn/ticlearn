import { OPEN_WEIGHT_CHAIN } from "./chain";

export interface TaskConfig {
  /** Model ids in the order to try them. Open weight only, see OPEN_WEIGHT_CHAIN. */
  chain: string[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
}

/**
 * Chat is the metered, high volume path, so it heads with the cheapest model
 * and falls back upward.
 */
const CHAT_CHAIN: string[] = [
  "openai/gpt-oss-120b",
  "z-ai/glm-4.7-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-v4.1-flash",
];

/**
 * Anything a student reads back as their own material heads with the strongest
 * open weight model. A wrong summary or a wrong quiz teaches the wrong thing,
 * and the note summary and quiz grading are the two places that shows.
 */
const QUALITY_CHAIN: string[] = [
  "deepseek/deepseek-v4.1-flash",
  "z-ai/glm-4.7-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-oss-120b",
];

export const taskRegistry: Record<string, TaskConfig> = {
  fast_chat: {
    chain: CHAT_CHAIN,
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: QUALITY_CHAIN,
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  summarize: {
    chain: QUALITY_CHAIN,
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: QUALITY_CHAIN,
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },
};

export function getTaskConfig(task: string): TaskConfig {
  const config = taskRegistry[task];
  if (!config) {
    throw new Error(
      `Unknown task: "${task}". Valid: ${Object.keys(taskRegistry).join(", ")}`,
    );
  }
  return config;
}

/**
 * The chain one task walks, in order. `AI_CHAIN_ORDER` overrides every task with
 * one global list, which is the lever to pull when a lab is down for everyone.
 */
export function resolveChain(task: string): string[] {
  const override = (process.env.AI_CHAIN_ORDER ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return override.length > 0 ? override : [...getTaskConfig(task).chain];
}

/** Models a prompt file header may name. Owned here so loader and jobs agree. */
export const MODEL_ALLOWLIST: string[] = [
  ...new Set([
    ...OPEN_WEIGHT_CHAIN,
    ...Object.values(taskRegistry).flatMap((config) => config.chain),
    "openrouter/fusion",
  ]),
];
