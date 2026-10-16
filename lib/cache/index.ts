/**
 * The shared cache, from spec 0010. One table, one module, one memory layer in
 * front of it.
 *
 * Three rules shape everything here. A cache is never on the critical path for
 * correctness, so every store failure is logged and then ignored, and a read
 * that would wait on a saturated connection pool is abandoned rather than
 * allowed to hang a student's request. A cached value holds no user data, so a
 * dump of the table is not a dump of anyone's notes. And nothing over the size
 * ceiling is stored, because one enormous payload would bloat the table and the
 * memory layer for no benefit.
 */

import crypto from "node:crypto";
import { getPlatformSettings } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { LruCache } from "./lru";

/** Bumped whenever any part of the key composition changes. */
const KEY_VERSION = "v1";

/** Nothing larger than this is stored, measured as JSON bytes. */
const MAX_VALUE_BYTES = 256 * 1024;

const MINUTE = 60_000;
const SECOND = 1_000;

/** How long an entry may live in the memory layer, whatever the store TTL is. */
const MEMORY_TTL_MS = 5 * MINUTE;

/** How long a store read may take before it is abandoned as a miss. */
const READ_TIMEOUT_MS = 400;

/**
 * One write in this many also trims the table. The nightly job is the real
 * sweep, but an hour of writes between two runs can push the table over its
 * ceiling, so this keeps it flat at a fraction of the write cost.
 */
const TRIM_SAMPLE = 100;

/** How large the memory layer may grow before it evicts. */
const MEMORY_MAX_ENTRIES = 200;

/** How many rows the table may hold at steady state. */
const MAX_ROWS = Number(process.env.CACHE_MAX_ROWS ?? 50_000);

/** Every part of a cache key, so a change to any of them makes a new key. */
export interface CacheKeyInput {
  /** The resolved model chain. An environment override can change it. */
  chain: readonly string[];
  /** The prompt text, or a stable serialisation of the messages. */
  prompt: string;
  /** Everything else the call varies on. */
  params?: unknown;
}

export interface CacheHit<T> {
  value: T;
  /** True when the answer came from cache rather than a model call. */
  fromCache: boolean;
}

const memory = new LruCache(MEMORY_MAX_ENTRIES);

/** In flight work, so a burst of identical misses makes one call. */
const inFlight = new Map<string, Promise<unknown>>();

function cacheKey(namespace: string, key: CacheKeyInput): string {
  const payload = JSON.stringify([
    KEY_VERSION,
    namespace,
    key.chain,
    key.prompt,
    key.params ?? null,
  ]);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function valueBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Cache read timed out after ${ms}ms`));
    }, ms);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function failOpen<T>(promise: Promise<T>, label: string): Promise<T | null> {
  return promise.catch((error) => {
    console.warn(`[cache] ${label} failed, continuing without it:`, error);
    return null;
  });
}

/**
 * Whether the shared cache is switched on. The answer lives in a platform
 * settings row so it can be flipped without a redeploy, and it is held for a
 * short window because reading a setting on every cache operation would cost
 * more than the cache saves. A failed read keeps the last answer, and the first
 * answer is the default, so a cache problem never blocks a request.
 */
const SWITCH_HOLD_MS = 30 * SECOND;
let switchReadAt = 0;
let switchValue = true;

async function cacheEnabled(): Promise<boolean> {
  const now = Date.now();
  if (now - switchReadAt < SWITCH_HOLD_MS) return switchValue;
  switchReadAt = now;
  const settings = await failOpen(getPlatformSettings(), "settings read");
  // Only an explicit false turns it off. A row that predates the field, or a
  // partial one, must not silently disable the cache.
  if (settings && typeof settings.sharedCacheEnabled === "boolean") {
    switchValue = settings.sharedCacheEnabled;
  }
  return switchValue;
}

/**
 * Read one entry. The memory layer answers first, then the store. Any failure
 * returns null, which the caller reads as a miss.
 */
export async function get<T>(
  namespace: string,
  key: CacheKeyInput,
): Promise<T | null> {
  if (!(await cacheEnabled())) return null;
  try {
    const fullKey = cacheKey(namespace, key);
    const local = memory.get(fullKey);
    if (local !== undefined) return local as T;

    const row = await failOpen(
      withTimeout(
        prisma.appCache.findUnique({ where: { key: fullKey } }),
        READ_TIMEOUT_MS,
      ),
      "store read",
    );
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;

    // Hold it locally for the shorter of the two lives, so a purge on the store
    // is complete everywhere rather than lingering on a warm instance.
    const memoryTtl = Math.min(
      MEMORY_TTL_MS,
      row.expiresAt.getTime() - Date.now(),
    );
    if (memoryTtl > 0) memory.set(fullKey, row.value, memoryTtl, namespace);
    return row.value as T;
  } catch (error) {
    console.warn("[cache] get failed, continuing without it:", error);
    return null;
  }
}

/**
 * Write one entry. A value over the size ceiling, or a store failure, is
 * dropped rather than raised, because a cache write must never fail a request.
 */
export async function set(
  namespace: string,
  key: CacheKeyInput,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  if (!(await cacheEnabled())) return;
  try {
    if (ttlMs <= 0) return;
    const bytes = valueBytes(value);
    if (bytes > MAX_VALUE_BYTES) {
      console.warn(
        `[cache] skipping a ${bytes} byte entry in ${namespace}, over the ${MAX_VALUE_BYTES} byte ceiling`,
      );
      return;
    }

    const fullKey = cacheKey(namespace, key);
    const expiresAt = new Date(Date.now() + ttlMs);
    const memoryTtl = Math.min(MEMORY_TTL_MS, ttlMs);
    memory.set(fullKey, value, memoryTtl, namespace);

    await failOpen(
      prisma.appCache.upsert({
        where: { key: fullKey },
        create: { key: fullKey, namespace, value: value as never, expiresAt },
        update: { value: value as never, expiresAt, createdAt: new Date() },
      }),
      "store write",
    );

    maybeTrim();
  } catch (error) {
    console.warn("[cache] set failed, continuing without it:", error);
  }
}

/**
 * A cheap background trim, so the ceiling holds between two sweeps. Never
 * awaited, because a write must not wait on housekeeping.
 */
function maybeTrim(): void {
  if (Math.random() >= 1 / TRIM_SAMPLE) return;
  void failOpen(
    (async () => {
      const overdue = await prisma.appCache.count();
      if (overdue <= MAX_ROWS) return;
      const oldest = await prisma.appCache.findMany({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
        select: { key: true },
        take: Math.min(500, overdue - MAX_ROWS),
      });
      if (oldest.length === 0) return;
      await prisma.appCache.deleteMany({
        where: { key: { in: oldest.map((row) => row.key) } },
      });
    })(),
    "store trim",
  );
}

/**
 * Read, or produce once and hold the answer. Concurrent callers inside this
 * instance share the one in flight call, so a burst of identical misses costs
 * one model call rather than one each. Across instances the guard cannot reach,
 * which is a known limit the spec records rather than solves.
 */
export async function withCache<T>(
  namespace: string,
  key: CacheKeyInput,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<CacheHit<T>> {
  const existing = await get<T>(namespace, key);
  if (existing !== null) return { value: existing, fromCache: true };

  const fullKey = cacheKey(namespace, key);
  const pending = inFlight.get(fullKey) as Promise<T> | undefined;
  if (pending) return { value: await pending, fromCache: false };

  const work = produce()
    .then(async (value) => {
      await set(namespace, key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inFlight.delete(fullKey);
    });

  inFlight.set(fullKey, work);
  return { value: await work, fromCache: false };
}

/** Drop every entry in one namespace, on the store and on this instance. */
export async function purgeNamespace(namespace: string): Promise<number> {
  const result = await failOpen(
    prisma.appCache.deleteMany({ where: { namespace } }),
    "store purge",
  );
  return (result?.count ?? 0) + memory.deleteByTag(namespace);
}

/** Test only: empty the memory layer so a fresh read goes to the store. */
export function clearMemory(): void {
  memory.clear();
  inFlight.clear();
}

export { MEMORY_TTL_MS, MEMORY_MAX_ENTRIES, READ_TIMEOUT_MS, MAX_VALUE_BYTES };
