import crypto from "crypto";

interface CacheEntry {
  result: unknown;
  expiresAt: number;
}

// In-memory cache — no Redis dependency
// For production with multiple instances, replace with DB or Redis
const store = new Map<string, CacheEntry>();

function hashKey(task: string, prompt: string): string {
  return crypto.createHash("sha256").update(`${task}:${prompt}`).digest("hex");
}

export function getCached(task: string, prompt: string): unknown | null {
  const key = hashKey(task, prompt);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.result;
}

export function setCached(
  task: string,
  prompt: string,
  result: unknown,
  ttlMs: number,
): void {
  const key = hashKey(task, prompt);
  store.set(key, { result, expiresAt: Date.now() + ttlMs });
}

export function clearCache(): void {
  store.clear();
}
