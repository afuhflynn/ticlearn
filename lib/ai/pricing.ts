/** Static per model list prices in USD per 1M tokens. Reviewed quarterly. */

export interface ModelPrice {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "google/gemini-3.7-flash": { inputPerMillion: 0.75, outputPerMillion: 3.75 },
  "openai/gpt-5-nano": { inputPerMillion: 0.05, outputPerMillion: 0.4 },
  "deepseek/deepseek-v4.1-flash": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "anthropic/claude-haiku-5.5": { inputPerMillion: 0.1, outputPerMillion: 0.5 },
  "z-ai/glm-4.7-flash": { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  "openai/gpt-5-mini": { inputPerMillion: 0.25, outputPerMillion: 2.0 },
  "google/gemini-3.8-flash": { inputPerMillion: 0.75, outputPerMillion: 3.75 },
  "anthropic/claude-haiku-4.5": { inputPerMillion: 1.0, outputPerMillion: 5.0 },
  "openai/gpt-oss-120b": { inputPerMillion: 0.0, outputPerMillion: 0.0 },
  "meta-llama/llama-3.3-70b-instruct": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "mistralai/mistral-medium-3.1": {
    inputPerMillion: 0.4,
    outputPerMillion: 2.0,
  },
  "x-ai/grok-4.7": { inputPerMillion: 2.0, outputPerMillion: 6.0 },
  // Free open weight models only on OpenRouter free tier. Zero cost until credits added.
  "nvidia/nemotron-3.5-super-vl:free": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "nvidia/nemotron-3.5-lightning:free": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
  "minimax/minimax-m3.1-flash:free": {
    inputPerMillion: 0.0,
    outputPerMillion: 0.0,
  },
};

export const DEFAULT_USD_TO_XAF_RATE = 650;

/** Env overrides the stored default so a deploy can move the rate without a migration. */
function envRate(): number {
  const raw = Number(process.env.USD_TO_XAF_RATE);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_USD_TO_XAF_RATE;
}

export function priceFor(modelId: string): ModelPrice {
  return (
    MODEL_PRICES[modelId] ?? { inputPerMillion: 0.5, outputPerMillion: 2.0 }
  );
}

export function estimateCostUsd(
  modelId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const price = priceFor(modelId);
  return (
    (promptTokens / 1_000_000) * price.inputPerMillion +
    (completionTokens / 1_000_000) * price.outputPerMillion
  );
}

export function usdToXaf(usd: number, rate: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : envRate();
  return Math.ceil(usd * safeRate);
}
