import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const db = prisma as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
  subscription: { groupBy: ReturnType<typeof vi.fn> };
  dailyMetric: { findMany: ReturnType<typeof vi.fn> };
};

const kpi = await vi.importActual<typeof import("@/lib/kpi")>("@/lib/kpi");
beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRaw = vi.fn().mockResolvedValue([{ count: 0 }]);
  db.subscription.groupBy = vi.fn().mockResolvedValue([]);
  db.dailyMetric = { findMany: vi.fn().mockResolvedValue([]) };
});

describe("lib/kpi (covers: AC-3)", () => {
  it("counts distinct active users in the database", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 12 }]);

    const result = await kpi.countDistinctActiveUsers(
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-02T00:00:00Z"),
    );

    expect(result).toBe(12);
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it("returns zero when no active users exist", async () => {
    db.$queryRaw.mockResolvedValue([{ count: 0 }]);

    await expect(
      kpi.countDistinctActiveUsers(new Date(), new Date()),
    ).resolves.toBe(0);
  });

  it("computes MRR from active subscriptions grouped by plan", async () => {
    db.subscription.groupBy.mockResolvedValue([
      { plan: "STANDARD", _sum: { amount: 5000 }, _count: 2 },
      { plan: "PREMIUM", _sum: { amount: 10000 }, _count: 1 },
    ]);

    const result = await kpi.computeMRR();

    expect(result.mrr).toBe(15000);
    expect(result.totalSubscribers).toBe(3);
    expect(result.byPlan).toEqual({ STANDARD: 5000, PREMIUM: 10000 });
  });

  it("reads cohort retention from stored daily metric rows", async () => {
    db.dailyMetric.findMany.mockResolvedValue([
      { metric: "cohort:2026-10:size", autoValue: 4 },
      { metric: "cohort:2026-10:w0", autoValue: 4 },
      { metric: "cohort:2026-10:w1", autoValue: 2 },
    ]);

    const rows = await kpi.computeCohortRetention();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cohort: "2026-10",
      cohortSize: 4,
      week0: 4,
      week1: 2,
      week2: -1,
    });
  });
});
