import type { LanguageModel } from "ai";
import {
  geminiFlash,
  geminiFlashLite,
  geminiPro,
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

export const taskRegistry: Record<string, TaskConfig> = {
  reasoning: {
    chain: [nimDeepSeek, nimMistral, nimNemotron, openai("gpt-5.5")],
    requiresTools: true,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  fast_chat: {
    chain: [geminiFlash, geminiFlashLite, nimMistral, nimDeepSeek],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 7 * 24 * 60 * 60 * 1000,
  },

  quiz_gen: {
    chain: [geminiFlash, geminiFlashLite, nimDeepSeek, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  exam_gen: {
    chain: [geminiFlash, geminiPro, nimDeepSeek, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_gen: {
    chain: [geminiFlash, geminiPro, nimMistral, nimDeepSeek, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 14 * 24 * 60 * 60 * 1000,
  },

  paper3_eval: {
    chain: [geminiFlash, geminiPro, nimMistral, nimDeepSeek, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  summarize: {
    chain: [geminiFlash, geminiFlashLite, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 30 * 24 * 60 * 60 * 1000,
  },

  grading: {
    chain: [geminiFlash, nimMistral, nimDeepSeek, openai("gpt-5.5")],
    requiresTools: false,
    requiresMultimodal: false,
    cacheTtlMs: 0,
  },

  image_extract: {
    chain: [geminiFlash, openai("gpt-5.5")],
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
