import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { READ_NAMESPACES } from "@/lib/cache/reads";

/**
 * Spec 0010, slice five. The read cache is only worth having if it reuses a
 * value across reads, drops it the moment a write changes it, and never lets
 * one student's readiness answer another's. The tests below prove exactly those
 * claims against the same store the AI path uses.
 *
 * The stand in for `app_cache` is one Map shared by every instance of the
 * module these tests import, so clearing the local memory layer is a real test
 * of the shared store rather than of the map in front of it.
 */
const table = new Map<
  string,
  {
    namespace: string;
    value: unknown;
    expiresAt: Date;
    createdAt: Date;
  }
>();

vi.mock("@/lib/platform-settings-direct", () => ({
  readPlatformSettings: vi.fn(() =>
    Promise.resolve({ sharedCacheEnabled: true } as never),
  ),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = table.get(where.key);
        if (!row) return null;
        return { key: where.key, ...row };
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { key: string };
          create: {
            namespace: string;
            value: unknown;
            expiresAt: Date;
            createdAt: Date;
          };
          update: Partial<{
            value: unknown;
            expiresAt: Date;
            createdAt: Date;
          }>;
        }) => {
          const existing = table.get(where.key);
          if (existing) {
            Object.assign(existing, update);
            return { key: where.key, ...existing };
          }
          table.set(where.key, {
            namespace: create.namespace,
            value: create.value,
            expiresAt: create.expiresAt,
            createdAt: create.createdAt ?? new Date(),
          });
          return { key: where.key, ...create } as { key: string };
        },
      ),
      deleteMany: vi.fn(
        async ({ where }: { where: { key?: string; namespace?: string } }) => {
          let removed = 0;
          for (const [key, row] of table) {
            const keyMatches = where.key ? key === where.key : false;
            const namespaceMatches = where.namespace
              ? row.namespace === where.namespace
              : false;
            if (keyMatches || namespaceMatches) {
              table.delete(key);
              removed += 1;
            }
          }
          return { count: removed };
        },
      ),
      count: vi.fn(async () => table.size),
    },
  },
}));

/** A brand new instance of the modules, with its own empty memory layer. */
async function freshInstance() {
  vi.resetModules();
  const reads = await import("@/lib/cache/reads");
  const cache = await import("@/lib/cache");
  return { ...reads, clearMemory: cache.clearMemory };
}

const STUDENT = "student-a";
const OTHER = "student-b";

beforeEach(() => {
  table.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("read reuse (covers: AC-23, AC-30)", () => {
  it("serves the shared entry after the local memory layer is cleared", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { readiness: 70 };
    };

    const first = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: STUDENT },
      produce,
    );
    reads.clearMemory();
    const second = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: STUDENT },
      produce,
    );

    expect(first).toEqual({ readiness: 70 });
    expect(second).toEqual({ readiness: 70 });
    expect(produced).toBe(1);
  });

  it("caches a global value for everyone with one key", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { mtnNumber: "+237600000000" };
    };

    await reads.withReadCache(
      "read:payment-settings",
      { kind: "global" },
      produce,
    );
    reads.clearMemory();
    const second = await reads.withReadCache(
      "read:payment-settings",
      { kind: "global" },
      produce,
    );

    expect(second).toEqual({ mtnNumber: "+237600000000" });
    expect(produced).toBe(1);
  });

  it("returns the payload alone, with no hit flag for a caller to branch on", async () => {
    const reads = await freshInstance();

    const value = await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      async () => ({ sharedCacheEnabled: true }),
    );

    expect(value).toEqual({ sharedCacheEnabled: true });
  });
});

describe("invalidation after a write (covers: AC-27, AC-28, AC-30)", () => {
  it("computes again when one student's readiness is invalidated", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { readiness: produced === 1 ? 40 : 90 };
    };

    const scope = { kind: "user" as const, userId: STUDENT };
    await reads.withReadCache("read:readiness", scope, produce);
    await reads.invalidateRead("read:readiness", scope);
    const fresh = await reads.withReadCache("read:readiness", scope, produce);

    expect(fresh).toEqual({ readiness: 90 });
    expect(produced).toBe(2);
  });

  it("clears a whole global namespace when the admin saves", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { creditCostQuizGeneration: produced === 1 ? 50 : 10 };
    };

    await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      produce,
    );
    await reads.invalidateReadNamespace("read:platform-settings");
    const fresh = await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      produce,
    );

    expect(fresh).toEqual({ creditCostQuizGeneration: 10 });
    expect(produced).toBe(2);
  });

  it("never lets one student's invalidation touch another's entry", async () => {
    const reads = await freshInstance();
    const calls = { a: 0, b: 0 };

    await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: STUDENT },
      async () => {
        calls.a += 1;
        return { readiness: 10 };
      },
    );
    await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: OTHER },
      async () => {
        calls.b += 1;
        return { readiness: 80 };
      },
    );

    await reads.invalidateRead("read:readiness", {
      kind: "user",
      userId: STUDENT,
    });

    const other = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: OTHER },
      async () => {
        calls.b += 1;
        return { readiness: 0 };
      },
    );

    expect(other).toEqual({ readiness: 80 });
    expect(calls).toEqual({ a: 1, b: 1 });
  });
});

describe("scope isolation (covers: AC-24, AC-30)", () => {
  it("gives two students two different entries that never cross", async () => {
    const reads = await freshInstance();

    const a = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: STUDENT },
      async () => ({ readiness: 10, topic: "Algebra" }),
    );
    const b = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: OTHER },
      async () => ({ readiness: 90, topic: "Cells" }),
    );

    expect(a).toEqual({ readiness: 10, topic: "Algebra" });
    expect(b).toEqual({ readiness: 90, topic: "Cells" });
    expect(
      reads.readKey("read:readiness", { kind: "user", userId: STUDENT }),
    ).not.toBe(
      reads.readKey("read:readiness", { kind: "user", userId: OTHER }),
    );
  });

  it("never stores a student id in the key", async () => {
    const reads = await freshInstance();
    const key = reads.readKey("read:readiness", {
      kind: "user",
      userId: STUDENT,
    });

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain(STUDENT);
  });

  it("refuses a personal namespace asked to run without a student", async () => {
    const reads = await freshInstance();

    await expect(
      reads.withReadCache("read:readiness", { kind: "global" }, async () => ({
        readiness: 0,
      })),
    ).rejects.toThrow(/read:readiness/);
  });

  it("refuses to clear a personal namespace for everyone", async () => {
    const reads = await freshInstance();

    await expect(
      reads.invalidateReadNamespace("read:readiness"),
    ).rejects.toThrow(/personal/);
  });
});

describe("expiry (covers: AC-29, AC-30)", () => {
  it("computes again once the registered life has passed", async () => {
    vi.useFakeTimers();
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { readiness: produced };
    };

    const scope = { kind: "user" as const, userId: STUDENT };
    await reads.withReadCache("read:readiness", scope, produce);

    vi.advanceTimersByTime(reads.READ_NAMESPACES["read:readiness"].ttlMs + 1);

    const fresh = await reads.withReadCache("read:readiness", scope, produce);
    expect(fresh).toEqual({ readiness: 2 });
    expect(produced).toBe(2);
  });

  it("never serves an expired row planted in the store", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { readiness: 5 };
    };

    const scope = { kind: "user" as const, userId: STUDENT };
    await reads.withReadCache("read:readiness", scope, produce);

    // Age the stored row without touching the memory layer's own clock.
    for (const row of table.values()) {
      row.expiresAt = new Date(Date.now() - 1_000);
    }
    reads.clearMemory();

    await reads.withReadCache("read:readiness", scope, produce);
    expect(produced).toBe(2);
  });
});

describe("failing open (covers: AC-29, AC-30)", () => {
  it("still serves the read when the store throws", async () => {
    const reads = await freshInstance();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.findUnique).mockRejectedValueOnce(
      new Error("pool exhausted"),
    );

    const value = await reads.withReadCache(
      "read:readiness",
      { kind: "user", userId: STUDENT },
      async () => ({ readiness: 42 }),
    );

    expect(value).toEqual({ readiness: 42 });
  });

  it("still completes a mutation when the invalidation fails", async () => {
    const reads = await freshInstance();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.deleteMany).mockRejectedValueOnce(
      new Error("connection reset"),
    );

    await expect(
      reads.invalidateRead("read:readiness", {
        kind: "user",
        userId: STUDENT,
      }),
    ).resolves.toBeUndefined();
  });
});

describe("the registry (covers: AC-23, AC-24)", () => {
  it("owns each value's scope and life", () => {
    expect(READ_NAMESPACES["read:platform-settings"]).toEqual({
      scope: "global",
      ttlMs: 60_000,
    });
    expect(READ_NAMESPACES["read:payment-settings"]).toEqual({
      scope: "global",
      ttlMs: 60_000,
    });
    expect(READ_NAMESPACES["read:readiness"]).toEqual({
      scope: "user",
      ttlMs: 60_000,
    });
  });
});
