import type { LanguageModel } from "ai";
import {
  geminiFlash,
  nimDeepSeek,
  nimMistral,
  nimNemotron,
  openai,
} from "./instances";

export interface TaskConfig {
  chain: LanguageModel[];
  requiresTools: boolean;
  requiresMultimodal: boolean;
  cacheTtlMs?: number;
}

const gpt = openai("gpt-5.5");

export const taskRegistry: Record<string, TaskConfig> = {
  reasoning: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: true,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  fast_chat: {
    chain: [gpt, geminiFlash, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  exam_gen: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_gen: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_eval: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  summarize: {
    chain: [gpt, geminiFlash, nimMistral],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: [gpt, geminiFlash, nimNemotron, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  image_extract: {
    chain: [geminiFlash, gpt],
    requiresTools: false,
    requiresMultimodal: true,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },
};

export function getTaskConfig(task: string): TaskConfig {
  const config = taskRegistry[task];
  if (!config) {
    throw new Error(`Unknown task: "${task}". Valid: ${Object.keys(taskRegistry).join(", ")}`);
  }
  return config;
}
