import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Fails loudly at first use rather than letting every student see a raw provider
 * 401. Callers already turn a chain failure into a friendly message, so an
 * unset key must be diagnosable in the logs, not silent.
 */
function requireOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Every model call routes through OpenRouter.",
    );
  }
  return key;
}

// Built lazily so importing this module never throws, which keeps the test
// suite and any tooling that imports it without secrets working.
let cached: ReturnType<typeof createOpenAICompatible> | null = null;

export function openrouter(): ReturnType<typeof createOpenAICompatible> {
  if (!cached) {
    cached = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: requireOpenRouterKey(),
    });
  }
  return cached;
}

function requireMuseKey(): string {
  const key = process.env.MUSE_API_KEY ?? "";
  if (!key) {
    throw new Error(
      "MUSE_API_KEY is not set. Muse calls route directly to Meta Model API.",
    );
  }
  return key;
}

function requireBasetenKey(): string {
  const key = process.env.BAASETEN_API_KEY ?? "";
  if (!key) {
    throw new Error(
      "BAASETEN_API_KEY is not set. Baseten calls route directly to Baseten inference.",
    );
  }
  return key;
}

/** Lazy singleton for Muse Spark 1.3 through Meta Model API. */
let cachedMuse: ReturnType<typeof createOpenAICompatible> | null = null;

export function muse(): ReturnType<typeof createOpenAICompatible> {
  if (!cachedMuse) {
    cachedMuse = createOpenAICompatible({
      name: "muse-meta",
      baseURL: process.env.MUSE_BASE_URL ?? "https://api.meta.ai/v1",
      apiKey: requireMuseKey(),
    });
  }
  return cachedMuse;
}

/** Lazy singleton for Muse Spark Open through Baseten inference. */
let cachedBaseten: ReturnType<typeof createOpenAICompatible> | null = null;

export function baseten(): ReturnType<typeof createOpenAICompatible> {
  if (!cachedBaseten) {
    cachedBaseten = createOpenAICompatible({
      name: "muse-baseten",
      baseURL:
        process.env.BAASETEN_BASE_URL ?? "https://inference.baseten.co/v1",
      apiKey: requireBasetenKey(),
    });
  }
  return cachedBaseten;
}
