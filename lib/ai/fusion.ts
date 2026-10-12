import { generateText } from "ai";
import { chainModel } from "./chain";
import { logUsage, usageFromResult } from "./usage";

const FUSION_MODEL = "openrouter/fusion";
const FUSION_MAX_COST_USD = 0.5;

export function fusionAllowed(): boolean {
  return process.env.AI_FUSION_ALLOW === "1";
}

/** Rare deep research path. Explicit opt in only, never part of the fallback walk. */
export async function runFusionResearch(opts: {
  prompt: string;
  userId?: string | null;
  isAdmin?: boolean;
}): Promise<{ text: string; modelId: string }> {
  if (!fusionAllowed()) {
    throw new Error("Fusion is off. Set AI_FUSION_ALLOW to 1 for gated use.");
  }
  if (!opts.isAdmin) {
    throw new Error("Fusion is admin only while gated.");
  }
  const started = Date.now();
  const result = await generateText({
    model: chainModel(FUSION_MODEL),
    prompt: opts.prompt,
    timeout: 60_000,
    maxRetries: 0,
  });
  const parsed = usageFromResult(result as { usage?: unknown }, FUSION_MODEL);
  if (parsed.costUsd > FUSION_MAX_COST_USD) {
    console.warn("[fusion] cost above guard:", parsed.costUsd);
  }
  await logUsage({
    userId: opts.userId ?? null,
    task: "fusion_research",
    modelId: FUSION_MODEL,
    promptTokens: parsed.promptTokens,
    completionTokens: parsed.completionTokens,
    costUsd: parsed.costUsd,
    latencyMs: Date.now() - started,
  });
  return { text: result.text, modelId: FUSION_MODEL };
}
