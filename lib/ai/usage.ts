import { prisma } from "@/lib/prisma";
import type { PromptRef } from "./orchestrator";
import { DEFAULT_USD_TO_XAF_RATE, estimateCostUsd, usdToXaf } from "./pricing";

export interface UsageInput {
  userId?: string | null;
  task: string;
  modelId: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  errorCode?: string | null;
  promptRef?: PromptRef;
  usdToXafRate?: number;
  /** Milliseconds from the request start to the first real stream content. */
  firstByteMs?: number | null;
  /** True when the answer came from the shared cache instead of a model call. */
  cacheHit?: boolean | null;
  /** The cache family an entry belonged to, when there was one. */
  cacheNamespace?: string | null;
  /** True when a keep alive frame was written before the first token. */
  keepAliveSent?: boolean | null;
  /** True when this request arrived on an instance that had barely warmed up. */
  coldStart?: boolean | null;
}

function tokensOf(usage: unknown): {
  prompt: number;
  completion: number;
  cost: number | null;
} {
  const anyUsage = usage as {
    promptTokens?: unknown;
    completionTokens?: unknown;
    inputTokens?: unknown;
    outputTokens?: unknown;
    cost?: unknown;
  } | null;
  if (!anyUsage || typeof anyUsage !== "object")
    return { prompt: 0, completion: 0, cost: null };
  const prompt =
    typeof anyUsage.promptTokens === "number"
      ? anyUsage.promptTokens
      : typeof anyUsage.inputTokens === "number"
        ? anyUsage.inputTokens
        : 0;
  const completion =
    typeof anyUsage.completionTokens === "number"
      ? anyUsage.completionTokens
      : typeof anyUsage.outputTokens === "number"
        ? anyUsage.outputTokens
        : 0;
  const cost = typeof anyUsage.cost === "number" ? anyUsage.cost : null;
  return { prompt, completion, cost };
}

export function usageFromResult(
  result: { usage?: unknown },
  modelId: string,
): { promptTokens: number; completionTokens: number; costUsd: number } {
  const parsed = tokensOf(result.usage);
  const costUsd =
    parsed.cost ?? estimateCostUsd(modelId, parsed.prompt, parsed.completion);
  return {
    promptTokens: parsed.prompt,
    completionTokens: parsed.completion,
    costUsd,
  };
}

export async function logUsage(input: UsageInput): Promise<void> {
  try {
    const rate =
      input.usdToXafRate && input.usdToXafRate > 0
        ? input.usdToXafRate
        : await resolveRate();
    const costUsd = input.costUsd ?? 0;
    await prisma.aiUsageEvent.create({
      data: {
        userId: input.userId ?? null,
        task: input.task,
        modelId: input.modelId,
        promptTokens: input.promptTokens ?? 0,
        completionTokens: input.completionTokens ?? 0,
        costUsd,
        costXaf: usdToXaf(costUsd, rate),
        usdToXafRate: rate,
        latencyMs: input.latencyMs ?? 0,
        errorCode: input.errorCode ?? null,
        firstByteMs: input.firstByteMs ?? null,
        cacheHit: input.cacheHit ?? null,
        cacheNamespace: input.cacheNamespace ?? null,
        keepAliveSent: input.keepAliveSent ?? null,
        coldStart: input.coldStart ?? null,
      },
    });
  } catch (error) {
    console.warn("[chain] usage write failed:", error);
  }
}

async function resolveRate(): Promise<number> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: "global" },
    });
    const rate = (row as { usdToXafRate?: unknown } | null)?.usdToXafRate;
    return typeof rate === "number" && rate > 0
      ? rate
      : DEFAULT_USD_TO_XAF_RATE;
  } catch {
    return DEFAULT_USD_TO_XAF_RATE;
  }
}

/**
 * The one home for the chat first byte budget. Reads `first_byte_ms` for new
 * conversation posts over a rolling window, so p75 and p95 come from one query
 * rather than a number each caller computes its own way.
 */
export async function chatFirstBytePercentiles(
  windowHours = 24,
): Promise<{ sample: number; p75: number | null; p95: number | null }> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const rows = await prisma.aiUsageEvent.findMany({
    where: {
      task: "fast_chat",
      firstByteMs: { not: null },
      createdAt: { gte: since },
    },
    select: { firstByteMs: true },
    orderBy: { firstByteMs: "asc" },
    take: 5000,
  });

  const values = rows
    .map((row) => row.firstByteMs)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return { sample: 0, p75: null, p95: null };
  }

  return {
    sample: values.length,
    p75: percentileOf(values, 0.75),
    p95: percentileOf(values, 0.95),
  };
}

function percentileOf(sorted: number[], fraction: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  );
  return sorted[index];
}

export function doualaDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export async function dailyTotals(
  userId: string,
  from: Date,
  to: Date,
): Promise<{ day: string; calls: number; tokens: number; costXaf: number }[]> {
  const rows = await prisma.aiUsageEvent.findMany({
    where: { userId, createdAt: { gte: from, lt: to } },
    select: {
      costXaf: true,
      costUsd: true,
      usdToXafRate: true,
      promptTokens: true,
      completionTokens: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });
  const byDay = new Map<
    string,
    { calls: number; tokens: number; usd: number; rate: number }
  >();
  for (const row of rows) {
    const day = doualaDay(row.createdAt);
    const slot = byDay.get(day) ?? { calls: 0, tokens: 0, usd: 0, rate: 0 };
    slot.calls += 1;
    slot.tokens += row.promptTokens + row.completionTokens;
    slot.usd += row.costUsd;
    if (row.usdToXafRate > 0) slot.rate = row.usdToXafRate;
    byDay.set(day, slot);
  }
  return [...byDay.entries()].map(([day, totals]) => ({
    day,
    calls: totals.calls,
    tokens: totals.tokens,
    // Sum the precise USD and convert once. Each stored row is whole XAF per
    // the money convention, so adding the rounded rows would round every call
    // up to a whole franc and inflate a student's total many times over.
    costXaf: usdToXaf(totals.usd, totals.rate || DEFAULT_USD_TO_XAF_RATE),
  }));
}
