import { OPEN_WEIGHT_CHAIN } from "./chain";
import { priceFor } from "./pricing";

export interface TaskConfig {
  /** Model ids in the order to try them. Open weight only, see OPEN_WEIGHT_CHAIN. */
  chain: string[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
  /** Provider that serves this task. Defaults to openrouter; meta and baseten
   *  route through chainMuse instead of chainModel. */
  provider?: "openrouter" | "meta" | "baseten";
}

/**
 * All tasks walk the same power ordered open weight chain. Head is the most
 * capable multimodal free model (Nemotron 3.5 Super VL), then down through the
 * rest of the free list. Paid frontier models are never in these chains; they
 * are gated behind AI_PAID_MODELS_ALLOW and appended only by the paid override.
 */
const OPEN_CHAIN: string[] = [...OPEN_WEIGHT_CHAIN];

/**
 * Agent tasks share the open chain but need tool calling enabled. The head
 * model must support both multimodal input and tool use, which Nemotron 3.5
 * Super VL does.
 */
const AGENT_CHAIN: string[] = [...OPEN_WEIGHT_CHAIN];

/**
 * Text only tasks start with pure text models so they never touch the
 * multimodal head model unless every text model fails. Multimodal models
 * sit at the bottom as fallbacks.
 */
export const TEXT_CHAIN: string[] = [
  "openai/gpt-oss-120b",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-v4.1-flash",
  "z-ai/glm-4.7-flash",
  "nvidia/nemotron-3.5-super-vl:free",
];

/**
 * Known paid frontier models. Never reachable from the free chain; only
 * usable when AI_PAID_MODELS_ALLOW=1 and explicitly opted into.
 */
const PAID_MODEL_IDS: string[] = [
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-5.5",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "google/gemini-3.7-flash",
  "google/gemini-3.8-flash",
  "x-ai/grok-4.7",
];

function isPaidModel(modelId: string): boolean {
  if (PAID_MODEL_IDS.includes(modelId)) return true;
  const price = priceFor(modelId);
  return price.inputPerMillion > 0 || price.outputPerMillion > 0;
}

export const taskRegistry: Record<string, TaskConfig> = {
  fast_chat: {
    chain: OPEN_CHAIN,
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: OPEN_CHAIN,
    requiresTools: false,
    requiresMultimodal: true,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  summarize: {
    chain: OPEN_CHAIN,
    requiresTools: false,
    requiresMultimodal: true,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: OPEN_CHAIN,
    requiresTools: false,
    requiresMultimodal: true,
    cacheTtlMs: 0,
  },

  agent_reason: {
    chain: AGENT_CHAIN,
    requiresTools: true,
    requiresMultimodal: true,
    cacheTtlMs: 0,
  },

  agent_plan: {
    chain: AGENT_CHAIN,
    requiresTools: true,
    requiresMultimodal: true,
    cacheTtlMs: 0,
  },

  course_analysis: {
    chain: ["muse-spark-1.3"],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
    provider: "meta",
  },

  question_gen: {
    chain: ["muse-spark-1.3"],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
    provider: "meta",
  },

  answer_evaluation: {
    chain: ["muse-spark-1.3"],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
    provider: "meta",
  },

  next_step: {
    chain: ["muse-spark-1.3"],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
    provider: "meta",
  },

  visual_analysis: {
    chain: ["meta-models/muse-spark-open-1026"],
    requiresTools: false,
    requiresMultimodal: true,
    cacheTtlMs: 0,
    provider: "baseten",
  },

  retry_explain: {
    chain: ["muse-spark-1.3"],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
    provider: "meta",
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
 * When `multimodal` is true, the chain leads with multimodal models so images
 * can be understood. When false, pure text models lead to save the multimodal
 * head model for turns that actually need it.
 */
export function resolveChain(
  task: string,
  options: { multimodal?: boolean } = {},
): string[] {
  const config = getTaskConfig(task);
  // Muse tasks (Meta and Baseten) bypass the OpenRouter chain logic entirely.
  // Their chain is a single model ID that routes directly through chainMuse.
  if (config.provider === "meta" || config.provider === "baseten") {
    return [...config.chain];
  }
  const override = (process.env.AI_CHAIN_ORDER ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  let chain: string[];
  if (override.length > 0) {
    chain = override;
  } else if (options.multimodal) {
    chain = [...config.chain];
  } else {
    chain = [...TEXT_CHAIN];
  }
  // Paid frontier models are never used unless the paid gate is explicitly open.
  // This is defense in depth: even if AI_CHAIN_ORDER names a paid model, it is
  // filtered out so no credit can ever be spent accidentally.
  if (process.env.AI_PAID_MODELS_ALLOW !== "1") {
    chain = chain.filter((modelId) => !isPaidModel(modelId));
  }
  if (chain.length === 0) {
    throw new Error(
      "No AI models available. Free open weight chain is empty and paid " +
        "models are gated behind AI_PAID_MODELS_ALLOW=1.",
    );
  }
  return chain;
}

/** Models a prompt file header may name. Owned here so loader and jobs agree. */
export const MODEL_ALLOWLIST: string[] = [
  ...new Set([
    ...OPEN_WEIGHT_CHAIN,
    ...Object.values(taskRegistry).flatMap((config) => config.chain),
    "openrouter/fusion",
  ]),
];
