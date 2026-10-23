/**
 * Read caching with revalidation, from spec 0010 slice five.
 *
 * Three values are read on nearly every request and change rarely: the platform
 * settings, the public payment details, and a student's readiness. This module
 * is the one place they are cached. It sits on the same store, memory layer,
 * single flight, size ceiling, and read timeout as the AI path, so nothing about
 * how a cache behaves is implemented twice.
 *
 * A caller never names a time to live and never writes a key. It names a
 * registered namespace, which owns the value's scope and life, and a scope,
 * which is either `global` or one student. Read keys carry a `read:` prefix and
 * are hashed from the namespace and the scope alone, so a key can always be
 * recomputed for invalidation, and two students can never reproduce each
 * other's key.
 */

import crypto from "node:crypto";
import { deleteByKey, purgeNamespace, withKey } from "./index";

/** Bumped whenever any part of the read key composition changes. */
const READ_KEY_VERSION = "v1";

/** Whether a value is shared by everyone, or belongs to one student. */
export type ReadScope = { kind: "global" } | { kind: "user"; userId: string };

interface ReadNamespaceConfig {
  readonly scope: "global" | "user";
  readonly ttlMs: number;
}

/**
 * The registry, the only source of a read cache's scope and life. Exported so a
 * test can read a namespace's life rather than copy the number.
 */
export const READ_NAMESPACES = {
  "read:platform-settings": { scope: "global", ttlMs: 60_000 },
  "read:payment-settings": { scope: "global", ttlMs: 60_000 },
  "read:readiness": { scope: "user", ttlMs: 60_000 },
} as const satisfies Record<string, ReadNamespaceConfig>;

export type ReadNamespace = keyof typeof READ_NAMESPACES;

/**
 * The exact key a read uses, recomputable from the namespace and the scope so
 * an invalidation can find the one entry it means.
 */
export function readKey(namespace: ReadNamespace, scope: ReadScope): string {
  const subject = scope.kind === "user" ? scope.userId : null;
  const payload = JSON.stringify([READ_KEY_VERSION, namespace, subject]);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * A programmer error, not a store failure: a personal namespace asked to run
 * without a student, or a global one asked to run for one, would either leak a
 * value or miss forever. Fail loudly rather than cache the wrong thing.
 */
function assertScope(namespace: ReadNamespace, scope: ReadScope): void {
  const expected = READ_NAMESPACES[namespace].scope;
  if (scope.kind !== expected) {
    throw new Error(
      `[cache] ${namespace} needs a ${expected} scope, received ${scope.kind}`,
    );
  }
  if (scope.kind === "user" && !scope.userId) {
    throw new Error(`[cache] ${namespace} needs a user id`);
  }
}

/**
 * Read through the cache, or produce the value and hold it for the namespace's
 * registered life. Single flight, the size ceiling, the read timeout, and the
 * fail open behaviour all come from the shared store unchanged. The payload is
 * returned alone, never the hit flag, so no call site can branch on whether the
 * value came from cache and no return type changes.
 */
export async function withReadCache<T>(
  namespace: ReadNamespace,
  scope: ReadScope,
  produce: () => Promise<T>,
): Promise<T> {
  assertScope(namespace, scope);
  const key = readKey(namespace, scope);
  const { value } = await withKey<T>(
    namespace,
    key,
    READ_NAMESPACES[namespace].ttlMs,
    produce,
  );
  return value;
}

/**
 * Drop one entry, on the store and on this instance. Used by readiness, where a
 * value belongs to one student, so one student practising never clears
 * everybody else's entry.
 */
export async function invalidateRead(
  namespace: ReadNamespace,
  scope: ReadScope,
): Promise<void> {
  assertScope(namespace, scope);
  try {
    await deleteByKey(namespace, readKey(namespace, scope));
  } catch (error) {
    console.warn(
      `[cache] invalidate ${namespace} failed, continuing without it:`,
      error,
    );
  }
}

/**
 * Drop every entry in one namespace. Used by the two global values, whose whole
 * namespace is the one key anyway. The store and memory failure paths are
 * already fail open, so a failed invalidation never fails a mutation.
 */
export async function invalidateReadNamespace(
  namespace: ReadNamespace,
): Promise<void> {
  // A personal value must be cleared one student at a time, so a read that
  // belongs to one student cannot be wiped for everyone by mistake.
  if (READ_NAMESPACES[namespace].scope !== "global") {
    throw new Error(`[cache] ${namespace} is personal, invalidate one user`);
  }
  try {
    await purgeNamespace(namespace);
  } catch (error) {
    console.warn(
      `[cache] invalidate ${namespace} failed, continuing without it:`,
      error,
    );
  }
}
