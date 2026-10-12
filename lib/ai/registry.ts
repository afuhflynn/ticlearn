import type { LanguageModel } from "ai";
import { DEFAULT_CHAIN } from "./chain";
import { openrouter } from "./instances";

export interface TaskConfig {
  chain: LanguageModel[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
}

function chainModels(): LanguageModel[] {
  return DEFAULT_CHAIN.map((id) => openrouter()(id));
}

/** Models a prompt file header may name. Owned here so loader and jobs agree. */
export const MODEL_ALLOWLIST: string[] = [
  ...DEFAULT_CHAIN,
  "gemini-2.5-flash",
  "openrouter/fusion",
];

export const taskRegistry: Record<string, TaskConfig> = {
  reasoning: {
    chain: chainModels(),
    requiresTools: true,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  fast_chat: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  exam_gen: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_gen: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_eval: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  summarize: {
    chain: chainModels(),
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: chainModels(),
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
