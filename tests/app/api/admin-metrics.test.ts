import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/metrics/route";
import { auth } from "@/lib/auth";
import {
  computeActivationFunnel,
  computeCohortRetention,
  computeMasteryMetrics,
  computeMRR,
  computeSubjectDistribution,
  countDistinctActiveUsers,
} from "@/lib/kpi";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn() },
    subscription: { count: vi.fn(), groupBy: vi.fn() },
    kpiEvent: { count: vi.fn(), groupBy: vi.fn() },
    dailyMetric: { findMany: vi.fn(), count: vi.fn() },
    topicPerformance: { findMany: vi.fn() },
    quiz: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/kpi", () => ({
  trackEvent: vi.fn(),
  countDistinctActiveUsers: vi.fn(),
  computeMRR: vi.fn(),
  computeCohortRetention: vi.fn(),
  computeSubjectDistribution: vi.fn(),
  computeMasteryMetrics: vi.fn(),
  computeActivationFunnel: vi.fn(),
  computeDailyMetrics: vi.fn(),
}));

const db = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  subscription: {
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  kpiEvent: {
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  dailyMetric: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  topicPerformance: { findMany: ReturnType<typeof vi.fn> };
  quiz: { groupBy: ReturnType<typeof vi.fn> };
};

function request(query = "") {
  return new Request(`http://localhost:3000/api/admin/metrics${query}`);
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "admin-1", role: "ADMIN" });
  db.user.count.mockResolvedValue(0);
  db.subscription.count.mockResolvedValue(0);
  db.subscription.groupBy.mockResolvedValue([]);
  db.kpiEvent.count.mockResolvedValue(0);
  db.kpiEvent.groupBy.mockResolvedValue([]);
  db.dailyMetric.findMany.mockResolvedValue([]);
  db.dailyMetric.count.mockResolvedValue(0);
  db.topicPerformance.findMany.mockResolvedValue([]);
  db.quiz.groupBy.mockResolvedValue([]);
  vi.mocked(countDistinctActiveUsers).mockResolvedValue(0);
  vi.mocked(computeMRR).mockResolvedValue({
    mrr: 0,
    byPlan: {},
    totalSubscribers: 0,
  });
  vi.mocked(computeCohortRetention).mockResolvedValue([]);
  vi.mocked(computeSubjectDistribution).mockResolvedValue([]);
  vi.mocked(computeMasteryMetrics).mockResolvedValue({
    avgMastery: 0,
    previousAvgMastery: 0,
    improvementRate: 0,
    recoveryDrillsCompleted: 0,
  });
  vi.mocked(computeActivationFunnel).mockResolvedValue({
    signedUp: 0,
    onboardingStarted: 0,
    onboardingCompleted: 0,
    firstQuizTaken: 0,
    returnedAfterOnboarding: 0,
  });
});

describe("GET /api/admin/metrics (covers: AC-3, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("returns 403 for a non admin caller", async () => {
    signIn({ id: "student-1", role: "USER" });

    const res = await GET(request());

    expect(res.status).toBe(403);
    expect(db.user.count).not.toHaveBeenCalled();
  });

  it("answers daily active users from the database distinct count", async () => {
    vi.mocked(countDistinctActiveUsers).mockResolvedValue(9);

    const body = await (await GET(request())).json();

    expect(countDistinctActiveUsers).toHaveBeenCalled();
    expect(body.summary.daus).toBe(9);
  });

  it("answers MRR from a grouped active subscription sum", async () => {
    vi.mocked(computeMRR).mockResolvedValue({
      mrr: 15000,
      byPlan: { STANDARD: 5000, PREMIUM: 10000 },
      totalSubscribers: 3,
    });

    const body = await (await GET(request("?tab=monetization"))).json();

    expect(body.summary.mrr).toBe(15000);
    expect(body.summary.totalSubscribers).toBe(3);
    expect(body.mrrByPlan).toEqual({ STANDARD: 5000, PREMIUM: 10000 });
  });

  it("serves cohort retention from stored rows", async () => {
    vi.mocked(computeCohortRetention).mockResolvedValue([
      {
        cohort: "2026-10",
        cohortSize: 4,
        week0: 4,
        week1: 3,
        week2: 2,
        week4: 1,
        week8: 0,
      },
    ]);

    const body = await (await GET(request("?tab=retention"))).json();

    expect(body.retention).toHaveLength(1);
    expect(body.retention[0].cohort).toBe("2026-10");
  });

  it("bounds the daily data read", async () => {
    await GET(request("?tab=data&granularity=daily&limit=5"));

    expect(db.dailyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });

  it("bounds the monthly aggregation read at 5000 rows", async () => {
    await GET(request("?tab=data&granularity=monthly&limit=50"));

    expect(db.dailyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5000 }),
    );
  });

  it("bounds the chart read at 2000 rows", async () => {
    await GET(request("?tab=engagement"));

    expect(db.dailyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2000 }),
    );
  });

  it("caps the data page size at 100", async () => {
    await GET(request("?tab=data&limit=500"));

    expect(db.dailyMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});
