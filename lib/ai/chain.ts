import { openrouter } from "./instances";

export const DEFAULT_CHAIN: string[] = [
  "google/gemini-3.7-flash",
  "openai/gpt-5-nano",
  "deepseek/deepseek-v4.1-flash",
  "anthropic/claude-haiku-5.5",
  "z-ai/glm-4.7-flash",
  "openai/gpt-5-mini",
  "google/gemini-3.8-flash",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-oss-120b",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-medium-3.1",
  "x-ai/grok-4.7",
];

export const CHAIN_DEADLINE_MS = 10_000;
/**
 * Streaming gets its own budget. A chat turn can run several tool steps
 * (`stopWhen: stepCountIs(5)`), so a total equal to the object path cap would
 * truncate real answers mid sentence.
 */
export const CHAIN_STREAM_DEADLINE_MS = 120_000;
export const TRIP_THRESHOLD = 3;
export const COOLDOWN_MS = 2 * 60_000;

export function getChain(): string[] {
  const raw = process.env.AI_CHAIN_ORDER ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : [...DEFAULT_CHAIN];
}

export function chainModel(modelId: string) {
  return openrouter()(modelId);
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
  return Math.max(2000, Math.min(safeTotal, 6000));
}

export async function withDeadline<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
