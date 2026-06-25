import type { LanguageModel } from "ai";
import { google } from "./instances";

export interface TaskConfig {
  chain: LanguageModel[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
}

const gemini = google("gemini-2.5-flash");

export const taskRegistry: Record<string, TaskConfig> = {
  reasoning: {
    chain: [gemini],
    requiresTools: true,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  fast_chat: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  exam_gen: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_gen: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_eval: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  summarize: {
    chain: [gemini],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: [gemini],
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
