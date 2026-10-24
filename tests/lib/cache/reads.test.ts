import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { READ_NAMESPACES } from "@/lib/cache/reads";

/**
 * Spec 0010, slice five. The read cache is only worth having if it reuses a
 * value across reads, drops it the moment a write changes it, and never serves
 * a stale copy. The tests below prove exactly those claims against the same
 * store the AI path uses.
 *
 * Spec 0014 removed the one personal namespace, so every value left is global.
 * The stand in for `app_cache` is one Map shared by every instance of the module
 * these tests import, so clearing the local memory layer is a real test of the
 * shared store rather than of the map in front of it.
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
      return { creditCostQuizGeneration: 50 };
    };

    const first = await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      produce,
    );
    reads.clearMemory();
    const second = await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      produce,
    );

    expect(first).toEqual({ creditCostQuizGeneration: 50 });
    expect(second).toEqual({ creditCostQuizGeneration: 50 });
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

  it("leaves the other global namespace alone", async () => {
    const reads = await freshInstance();
    let settingsProduced = 0;
    let paymentProduced = 0;

    await reads.withReadCache(
      "read:platform-settings",
      { kind: "global" },
      () => {
        settingsProduced += 1;
        return Promise.resolve({ sharedCacheEnabled: true });
      },
    );
    await reads.withReadCache(
      "read:payment-settings",
      { kind: "global" },
      () => {
        paymentProduced += 1;
        return Promise.resolve({ mtnNumber: "+237600000000" });
      },
    );

    await reads.invalidateReadNamespace("read:platform-settings");

    await reads.withReadCache(
      "read:payment-settings",
      { kind: "global" },
      () => {
        paymentProduced += 1;
        return Promise.resolve({ mtnNumber: "+237600000000" });
      },
    );

    expect(settingsProduced).toBe(1);
    expect(paymentProduced).toBe(1);
  });
});

describe("keys (covers: AC-24, AC-30)", () => {
  it("hashes the namespace into a stable key with no readable value in it", async () => {
    const reads = await freshInstance();
    const key = reads.readKey("read:platform-settings", { kind: "global" });

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).toBe(
      reads.readKey("read:platform-settings", { kind: "global" }),
    );
    expect(key).not.toBe(
      reads.readKey("read:payment-settings", { kind: "global" }),
    );
  });

  it("refuses a personal scope for a global namespace", async () => {
    const reads = await freshInstance();

    await expect(
      reads.withReadCache(
        "read:platform-settings",
        { kind: "user", userId: "student-a" },
        async () => ({ sharedCacheEnabled: true }),
      ),
    ).rejects.toThrow(/read:platform-settings/);
  });
});

describe("expiry (covers: AC-29, AC-30)", () => {
  it("computes again once the registered life has passed", async () => {
    vi.useFakeTimers();
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { creditCostQuizGeneration: produced };
    };

    const scope = { kind: "global" as const };
    await reads.withReadCache("read:platform-settings", scope, produce);

    vi.advanceTimersByTime(
      reads.READ_NAMESPACES["read:platform-settings"].ttlMs + 1,
    );

    const fresh = await reads.withReadCache(
      "read:platform-settings",
      scope,
      produce,
    );
    expect(fresh).toEqual({ creditCostQuizGeneration: 2 });
    expect(produced).toBe(2);
  });

  it("never serves an expired row planted in the store", async () => {
    const reads = await freshInstance();
    let produced = 0;

    const produce = async () => {
      produced += 1;
      return { creditCostQuizGeneration: 5 };
    };

    const scope = { kind: "global" as const };
    await reads.withReadCache("read:platform-settings", scope, produce);

    // Age the stored row without touching the memory layer's own clock.
    for (const row of table.values()) {
      row.expiresAt = new Date(Date.now() - 1_000);
    }
    reads.clearMemory();

    await reads.withReadCache("read:platform-settings", scope, produce);
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
      "read:platform-settings",
      { kind: "global" },
      async () => ({ creditCostQuizGeneration: 42 }),
    );

    expect(value).toEqual({ creditCostQuizGeneration: 42 });
  });

  it("still completes a mutation when the invalidation fails", async () => {
    const reads = await freshInstance();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.deleteMany).mockRejectedValueOnce(
      new Error("connection reset"),
    );

    await expect(
      reads.invalidateReadNamespace("read:platform-settings"),
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
  });
});
