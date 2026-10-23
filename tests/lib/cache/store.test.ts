import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Spec 0010, slice three. The store is the point of this slice, so the tests
 * that matter are the ones that prove it is shared, bounded, and harmless when
 * it breaks.
 *
 * The stand in for `app_cache` is one Map shared by every instance of the
 * module these tests import. That is the whole claim: two instances, one table,
 * and the second sees what the first wrote.
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
        async ({ where }: { where: { namespace?: string } }) => {
          let removed = 0;
          for (const [key, row] of table) {
            if (where.namespace && row.namespace === where.namespace) {
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

/** A brand new instance of the module, with its own empty memory layer. */
async function freshInstance() {
  vi.resetModules();
  return await import("@/lib/cache");
}

const KEY = {
  chain: ["model/one"],
  prompt: "the same question",
  params: { temperature: 0.4 },
};

beforeEach(() => {
  table.clear();
});

describe("the shared store (covers: AC-6)", () => {
  it("lets a second instance read what the first wrote", async () => {
    const first = await freshInstance();
    await first.set("quiz_gen", KEY, { answer: 42 }, 60_000);

    const second = await freshInstance();
    const found = await second.get<{ answer: number }>("quiz_gen", KEY);
    expect(found).toEqual({ answer: 42 });
  });

  it("does not serve an entry whose chain changed", async () => {
    const first = await freshInstance();
    await first.set("quiz_gen", KEY, { answer: 1 }, 60_000);

    const otherChain = { ...KEY, chain: ["model/two"] };
    const found = await first.get("quiz_gen", otherChain);
    expect(found).toBeNull();
  });

  it("does not serve an entry whose prompt changed", async () => {
    const first = await freshInstance();
    await first.set("quiz_gen", KEY, { answer: 1 }, 60_000);

    const found = await first.get("quiz_gen", { ...KEY, prompt: "another" });
    expect(found).toBeNull();
  });
});

describe("the memory layer (covers: AC-9)", () => {
  it("holds the newest reads and stops holding the oldest, so it cannot grow", async () => {
    const cache = await freshInstance();
    for (let index = 0; index < 260; index += 1) {
      await cache.set("quiz_gen", { ...KEY, params: { index } }, index, 60_000);
    }

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.findUnique).mockClear();

    // The newest entry answers from memory, so the store is never asked.
    const newest = await cache.get("quiz_gen", {
      ...KEY,
      params: { index: 259 },
    });
    expect(newest).toBe(259);
    expect(prisma.appCache.findUnique).not.toHaveBeenCalled();

    // The oldest was evicted, so the store is asked. Eviction is not deletion,
    // which is why the value still comes back.
    const oldest = await cache.get("quiz_gen", {
      ...KEY,
      params: { index: 0 },
    });
    expect(oldest).toBe(0);
    expect(prisma.appCache.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("expiry (covers: AC-10)", () => {
  it("never serves an entry past its time", async () => {
    const cache = await freshInstance();
    await cache.set("quiz_gen", KEY, { answer: 1 }, -1);

    // An expired row sitting in the table is never served.
    table.set(cacheKeyForTest(), {
      namespace: "quiz_gen",
      value: { answer: 1 },
      expiresAt: new Date(Date.now() - 1_000),
      createdAt: new Date(),
    });
    const found = await cache.get("quiz_gen", KEY);
    expect(found).toBeNull();
  });
});

describe("single flight (covers: AC-7)", () => {
  it("makes one call when a burst asks for the same key", async () => {
    const cache = await freshInstance();
    let calls = 0;

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        cache.withCache("quiz_gen", KEY, 60_000, async () => {
          calls += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { answer: calls };
        }),
      ),
    );

    expect(calls).toBe(1);
    expect(results.every((result) => result.value.answer === 1)).toBe(true);
    expect(results.filter((result) => result.fromCache).length).toBe(0);
  });
});

describe("failing open (covers: AC-8)", () => {
  it("treats a store that throws as a miss", async () => {
    const cache = await freshInstance();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.findUnique).mockRejectedValueOnce(
      new Error("pool exhausted"),
    );

    const found = await cache.get("quiz_gen", KEY);
    expect(found).toBeNull();
  });

  it("still answers through production when the store write fails", async () => {
    const cache = await freshInstance();
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.upsert).mockRejectedValueOnce(
      new Error("disk full"),
    );

    const hit = await cache.withCache("quiz_gen", KEY, 60_000, async () => ({
      answer: 7,
    }));
    expect(hit).toEqual({ value: { answer: 7 }, fromCache: false });
  });
});

describe("the value ceiling (covers: AC-12)", () => {
  it("does not store a payload over the ceiling", async () => {
    const cache = await freshInstance();
    const huge = { blob: "x".repeat(300 * 1024) };

    await cache.set("quiz_gen", KEY, huge, 60_000);
    const second = await freshInstance();
    const found = await second.get("quiz_gen", KEY);
    expect(found).toBeNull();
  });
});

describe("purging one namespace (covers: AC-21)", () => {
  it("clears that namespace and leaves the others alone", async () => {
    const cache = await freshInstance();
    await cache.set("quiz_gen", KEY, { answer: 1 }, 60_000);
    await cache.set("summarize", KEY, { answer: 2 }, 60_000);

    await cache.purgeNamespace("quiz_gen");

    const quizGone = await cache.get("quiz_gen", KEY);
    const summaryKept = await cache.get("summarize", KEY);
    expect(quizGone).toBeNull();
    expect(summaryKept).toEqual({ answer: 2 });
  });
});

/** The sha256 the module would build, so a row can be planted directly. */
function cacheKeyForTest(): string {
  return require("node:crypto")
    .createHash("sha256")
    .update(
      JSON.stringify(["v1", "quiz_gen", KEY.chain, KEY.prompt, KEY.params]),
    )
    .digest("hex");
}
