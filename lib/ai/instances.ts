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
