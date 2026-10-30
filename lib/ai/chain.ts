import { baseten, muse, openrouter } from "./instances";

/**
 * Open weight models only, cheapest first. The platform cannot carry a bill for
 * proprietary models, so no task chain may name one. `lib/ai/registry.ts` orders
 * these per task, and `MODEL_PRICES` prices every id here.
 */
export const OPEN_WEIGHT_CHAIN: string[] = [
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3.5-lightning:free",
  "deepseek/deepseek-v4.1-flash",
  "z-ai/glm-4.7-flash",
  "minimax/minimax-m3.1-flash:free",
  "openai/gpt-oss-120b",
  "meta-llama/llama-3.3-70b-instruct",
];

export const CHAIN_DEADLINE_MS = 30_000;
/**
 * Streaming gets its own budget. A chat turn can run several tool steps
 * (`stopWhen: stepCountIs(5)`), so a total equal to the object path cap would
 * truncate real answers mid sentence.
 */
export const CHAIN_STREAM_DEADLINE_MS = 45_000;
/**
 * Per-leg timeout for a Muse (Meta or Baseten) call. Chat streams through
 * `streamText`, so this is the budget for the first token, not the whole
 * answer; a slow prefill falls through to OpenRouter instead of holding the
 * student's turn hostage. Non-streaming Muse calls share the same budget.
 */
export const MUSE_PER_LEG_TIMEOUT_MS = 30_000;
export const TRIP_THRESHOLD = 3;
export const COOLDOWN_MS = 2 * 60_000;

export function chainModel(modelId: string) {
  return openrouter()(modelId);
}

/**
 * Builds a Muse model for the given model ID. Model IDs starting with
 * `meta-models/` route to Baseten; everything else routes to Meta Model API.
 * Each call constructs the provider fresh so a missing key throws at call time
 * and can be caught for OpenRouter fallback.
 */
export function chainMuse(modelId: string) {
  if (modelId.startsWith("meta-models/")) {
    return baseten()(modelId);
  }
  return muse()(modelId);
}

export function headFailArmed(): boolean {
  return process.env.AI_HEAD_FAIL_ONCE === "1";
}

const TRANSPORT_HINTS = [
  "timeout",
  "timed out",
  "abort",
  "aborted",
  "econnreset",
  "econnrefused",
  "socket",
  "network",
  "fetch failed",
  "provider_unavailable",
  "provider down",
  "overloaded",
  "no-endpoints",
  "no endpoints",
  "rate_limit",
  "rate limit",
  "too many requests",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
  "stream ended before first token",
  "empty stream",
];

const SCHEMA_HINTS = [
  "zod",
  "validation",
  "noobjectgenerated",
  "no object",
  "invalidresponsedata",
  "invalid response",
  "typevalidation",
  "did not match",
];

function messageOf(error: unknown): string {
  if (error instanceof Error)
    return `${error.name}: ${error.message}`.toLowerCase();
  return String(error).toLowerCase();
}

export function statusOf(error: unknown): number | null {
  const anyErr = error as { status?: unknown; statusCode?: unknown };
  const raw = anyErr?.status ?? anyErr?.statusCode;
  return typeof raw === "number" ? raw : null;
}

export function isSchemaError(error: unknown): boolean {
  const msg = messageOf(error);
  return SCHEMA_HINTS.some((hint) => msg.includes(hint));
}

/**
 * Statuses that are a property of the request, not of one model, so trying the
 * rest of the chain cannot help and the walk stops.
 */
const REQUEST_SCOPED_FAILURES = new Set([400, 401, 402, 422]);

export function isFailFastError(error: unknown): boolean {
  if (isSchemaError(error)) return true;
  const status = statusOf(error);
  if (status === null) return false;
  return REQUEST_SCOPED_FAILURES.has(status);
}

export function isTransportError(error: unknown): boolean {
  if (isSchemaError(error)) return false;
  if (isFailFastError(error)) return false;
  const status = statusOf(error);
  if (status === 429) return true;
  if (status !== null && status >= 500) return true;
  const msg = messageOf(error);
  return TRANSPORT_HINTS.some((hint) => msg.includes(hint));
}

export function perAttemptBudget(totalMs: number, remaining: number): number {
  const safeTotal =
    Number.isFinite(totalMs) && totalMs > 0 ? totalMs : CHAIN_DEADLINE_MS;
  void remaining;
  return Math.max(2000, Math.min(safeTotal, 15000));
}

export async function withDeadline<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
  outer?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort(outer?.reason);
  if (outer) {
    if (outer.aborted) {
      controller.abort(outer.reason);
    } else {
      outer.addEventListener("abort", onOuterAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}
