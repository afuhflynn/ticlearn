import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  onboardingFindMany: vi.fn(),
  onboardingDeleteMany: vi.fn(),
  appCacheFindMany: vi.fn(),
  appCacheDeleteMany: vi.fn(),
  appCacheCount: vi.fn(),
  webSearchFindMany: vi.fn(),
  webSearchDeleteMany: vi.fn(),
}));

const {
  onboardingFindMany,
  onboardingDeleteMany,
  appCacheFindMany,
  appCacheDeleteMany,
  appCacheCount,
  webSearchFindMany,
  webSearchDeleteMany,
} = fns;

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: (_opts: unknown, fn: unknown) => ({ run: fn }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appCache: {
      findMany: fns.appCacheFindMany,
      deleteMany: fns.appCacheDeleteMany,
      count: fns.appCacheCount,
    },
    webSearchEvent: {
      findMany: fns.webSearchFindMany,
      deleteMany: fns.webSearchDeleteMany,
    },
    onboardingProgress: {
      findMany: fns.onboardingFindMany,
      deleteMany: fns.onboardingDeleteMany,
    },
  },
}));

import { pruneAppCache } from "@/lib/inngest/cache-cleanup-functions";

type Runner = () => Promise<{
  expired: number;
  trimmed: number;
  ceiling: number;
  searchEvents: number;
  onboardingRows: number;
}>;

const run = () => (pruneAppCache as unknown as { run: Runner }).run();

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  appCacheFindMany.mockResolvedValue([]);
  appCacheDeleteMany.mockResolvedValue({ count: 0 });
  appCacheCount.mockResolvedValue(0);
  webSearchFindMany.mockResolvedValue([]);
  webSearchDeleteMany.mockResolvedValue({ count: 0 });
  onboardingFindMany.mockResolvedValue([]);
  onboardingDeleteMany.mockResolvedValue({ count: 1 });
});

/**
 * The setup row retention rule (spec 0041 invariant: stale rows clear
 * after 30 days).
 *
 * The sweep runs inside the existing nightly prune. Untouched rows past
 * the cutoff go away in batches; fresh rows stay; an empty table means
 * no delete call at all.
 */
describe("pruneAppCache setup retention (covers: 30 day sweep)", () => {
  it("deletes stale setup rows and reports the count", async () => {
    onboardingFindMany
      .mockResolvedValueOnce([{ id: "stale-1" }])
      .mockResolvedValueOnce([]);

    const result = await run();

    expect(result.onboardingRows).toBe(1);
    expect(onboardingDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["stale-1"] } },
    });
  });

  it("leaves fresh rows alone", async () => {
    onboardingFindMany.mockImplementation(
      async (args: { where: { updatedAt: { lt: Date } } }) => {
        const cutoff = args.where.updatedAt.lt.getTime();
        const fresh = Date.now() - 2 * DAY_MS;
        return fresh < cutoff ? [] : [{ id: "wrong" }];
      },
    );

    const result = await run();

    expect(result.onboardingRows).toBe(0);
    expect(onboardingDeleteMany).not.toHaveBeenCalled();
  });

  it("uses a 30 day cutoff", async () => {
    let seen: Date | null = null;
    onboardingFindMany.mockImplementation(
      async (args: { where: { updatedAt: { lt: Date } } }) => {
        seen = args.where.updatedAt.lt;
        return [];
      },
    );

    await run();

    const expected = Date.now() - 30 * DAY_MS;
    expect(seen).not.toBeNull();
    expect(
      Math.abs((seen as unknown as Date).getTime() - expected),
    ).toBeLessThan(60_000);
  });

  it("makes no setup delete call when nothing is stale", async () => {
    onboardingFindMany.mockResolvedValue([]);

    const result = await run();

    expect(result.onboardingRows).toBe(0);
    expect(onboardingDeleteMany).not.toHaveBeenCalled();
  });
});
