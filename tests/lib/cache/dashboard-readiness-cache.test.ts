import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearMemory } from "@/lib/cache";
import { readKey } from "@/lib/cache/reads";
import { getDashboardReadiness } from "@/lib/dashboard-data";
import { readPlatformSettings } from "@/lib/platform-settings-direct";
import { computeReadiness } from "@/lib/readiness";

/**
 * Spec 0010, slice five. A student's readiness is the one personal value the
 * read cache holds, so it has to be reused, kept apart per student, and
 * recomputed once its life ends. The dashboard prefetch and `/api/readiness`
 * both call this function, so a mistake here would show one student a number
 * computed for another.
 */

const harness = vi.hoisted(() => ({
  table: new Map<
    string,
    {
      namespace: string;
      value: unknown;
      expiresAt: Date;
      createdAt: Date;
    }
  >(),
}));

vi.mock("@/lib/platform-settings-direct", () => ({
  readPlatformSettings: vi.fn(() =>
    Promise.resolve({ sharedCacheEnabled: true } as never),
  ),
}));

vi.mock("@/lib/readiness", () => ({
  computeReadiness: vi.fn(),
}));

// The cache switch must ask the database directly. If the cache module ever
// read the switch through the cached accessor this mock would be called, so the
// guard test below fails instead of the stack overflowing at runtime.
vi.mock("@/lib/platform-settings", () => ({
  getPlatformSettings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appCache: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
        const row = harness.table.get(where.key);
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
            createdAt?: Date;
          };
          update: Partial<{
            value: unknown;
            expiresAt: Date;
            createdAt: Date;
          }>;
        }) => {
          const existing = harness.table.get(where.key);
          if (existing) {
            Object.assign(existing, update);
            return { key: where.key, ...existing };
          }
          const row = {
            namespace: create.namespace,
            value: create.value,
            expiresAt: create.expiresAt,
            createdAt: create.createdAt ?? new Date(),
          };
          harness.table.set(where.key, row);
          return { key: where.key, ...row };
        },
      ),
      deleteMany: vi.fn(
        async ({ where }: { where: { key?: string; namespace?: string } }) => {
          let removed = 0;
          for (const [key, row] of harness.table) {
            const keyMatches = where.key ? key === where.key : false;
            const namespaceMatches = where.namespace
              ? row.namespace === where.namespace
              : false;
            if (keyMatches || namespaceMatches) {
              harness.table.delete(key);
              removed += 1;
            }
          }
          return { count: removed };
        },
      ),
      count: vi.fn(async () => harness.table.size),
      findMany: vi.fn(async () => []),
    },
    topicPerformance: { count: vi.fn(async () => 1) },
  },
}));

const STUDENT = "student-a";
const OTHER = "student-b";

function readiness(overrides: Record<string, unknown> = {}) {
  return {
    readiness: 70,
    weakestTopic: { name: "Algebra", score: 30 },
    strongestTopic: { name: "Cells", score: 90 },
    topicReadiness: [
      { topic: "Algebra", score: 30, notes: 1 },
      { topic: "Cells", score: 90, notes: 2 },
    ],
    needsAssessment: false,
    ...overrides,
  };
}

function producedReadiness(score: number, overrides = {}) {
  return readiness({
    readiness: score,
    weakestTopic: { name: "Algebra", score },
    strongestTopic: { name: "Cells", score },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.table.clear();
  clearMemory();
  vi.mocked(computeReadiness).mockResolvedValue(producedReadiness(70) as never);
});

describe("the cache switch (covers: AC-26)", () => {
  // This block runs first on purpose: the switch answer is held for thirty
  // seconds, so only the first cache operation in this file reads it.
  it("asks the database directly, never the cached settings accessor", async () => {
    const { getPlatformSettings } = await import("@/lib/platform-settings");

    await getDashboardReadiness(STUDENT);

    expect(harness.table.size).toBe(1);
    expect(readPlatformSettings).toHaveBeenCalledTimes(1);
    expect(getPlatformSettings).not.toHaveBeenCalled();
  });
});

describe("readiness reuse (covers: AC-23, AC-24, AC-30)", () => {
  it("computes once and serves the shared entry after the memory layer clears", async () => {
    const first = await getDashboardReadiness(STUDENT);
    clearMemory();
    const second = await getDashboardReadiness(STUDENT);

    expect(first.readiness).toBe(70);
    expect(second).toEqual(first);
    expect(computeReadiness).toHaveBeenCalledTimes(1);
    expect(harness.table.size).toBe(1);
  });

  it("keeps two students' readiness on two keys that never cross", async () => {
    vi.mocked(computeReadiness).mockImplementation(
      async (userId: string) =>
        producedReadiness(userId === STUDENT ? 77 : 50, {
          needsAssessment: userId !== STUDENT,
        }) as never,
    );

    const a = await getDashboardReadiness(STUDENT);
    const b = await getDashboardReadiness(OTHER);

    expect(a.readiness).toBe(77);
    expect(a.needsAssessment).toBe(false);
    expect(b.readiness).toBe(50);
    expect(b.needsAssessment).toBe(true);

    const keyA = readKey("read:readiness", { kind: "user", userId: STUDENT });
    const keyB = readKey("read:readiness", { kind: "user", userId: OTHER });
    expect(keyA).not.toBe(keyB);
    expect(keyA).toMatch(/^[a-f0-9]{64}$/);
    expect(keyA).not.toContain(STUDENT);
    expect(harness.table.has(keyA)).toBe(true);
    expect(harness.table.has(keyB)).toBe(true);
    expect(harness.table.size).toBe(2);
  });

  it("returns the payload the dashboard and the route both read", async () => {
    const value = await getDashboardReadiness(STUDENT);

    expect(Object.keys(value).sort()).toEqual(
      [
        "needsAssessment",
        "readiness",
        "recommendations",
        "strongestTopic",
        "topicReadiness",
        "weakestTopic",
      ].sort(),
    );
    expect(Array.isArray(value.recommendations)).toBe(true);
  });
});

describe("readiness recompute (covers: AC-29, AC-30)", () => {
  it("computes again once the registered life has passed", async () => {
    await getDashboardReadiness(STUDENT);
    vi.mocked(computeReadiness).mockResolvedValue(
      producedReadiness(85) as never,
    );

    for (const row of harness.table.values()) {
      row.expiresAt = new Date(Date.now() - 1_000);
    }
    clearMemory();

    const fresh = await getDashboardReadiness(STUDENT);

    expect(fresh.readiness).toBe(85);
    expect(computeReadiness).toHaveBeenCalledTimes(2);
  });

  it("still answers when the store throws", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.appCache.findUnique).mockRejectedValueOnce(
      new Error("pool exhausted"),
    );

    const value = await getDashboardReadiness(STUDENT);

    expect(value.readiness).toBe(70);
    expect(computeReadiness).toHaveBeenCalledTimes(1);
  });
});

describe("readiness recommendations (covers: AC-25)", () => {
  it("names the weak topic and the assessment when both apply", async () => {
    vi.mocked(computeReadiness).mockResolvedValue(
      producedReadiness(20, { needsAssessment: true }) as never,
    );
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.topicPerformance.count).mockResolvedValueOnce(0);

    const value = await getDashboardReadiness(STUDENT);

    expect(value.recommendations).toEqual([
      "Practice Algebra - currently at 20%",
      "Upload a note and generate a quiz from it to see your readiness",
      "You haven't practised Algebra recently",
    ]);
  });

  it("leaves a strong topic alone and stays quiet after recent practice", async () => {
    vi.mocked(computeReadiness).mockResolvedValue(
      producedReadiness(80, { needsAssessment: false }) as never,
    );
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.topicPerformance.count).mockResolvedValueOnce(3);

    const value = await getDashboardReadiness(STUDENT);

    expect(value.recommendations).toEqual([]);
  });
});
