import type { LanguageModel } from "ai";
import { openai } from "./instances";

export interface TaskConfig {
  chain: LanguageModel[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
}

const gpt = openai("gpt-5.5");

export const taskRegistry: Record<string, TaskConfig> = {
  reasoning: {
    chain: [gpt],
    requiresTools: true,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  fast_chat: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  exam_gen: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_gen: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_eval: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  summarize: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: [gpt],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },
};

export function getTaskConfig(task: string): TaskConfig {
  const config = taskRegistry[task];
  if (!config) {
    throw new Error(`Unknown task: "${task}". Valid: ${Object.keys(taskRegistry).join(", ")}`);
  }
  return config;
}
