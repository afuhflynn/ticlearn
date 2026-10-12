import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_USD_TO_XAF_RATE } from "@/lib/ai/pricing";
import {
  dailyTotals,
  doualaDay,
  logUsage,
  usageFromResult,
} from "@/lib/ai/usage";
import { prisma } from "@/lib/prisma";

const events = prisma.aiUsageEvent as unknown as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};
const settings = prisma.platformSettings as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  events.create.mockResolvedValue({});
  events.findMany.mockResolvedValue([]);
  settings.findUnique.mockResolvedValue(null);
});

describe("usageFromResult", () => {
  it("reads prompt and completion tokens from the served response", () => {
    const parsed = usageFromResult(
      { usage: { promptTokens: 100, completionTokens: 20 } },
      "openai/gpt-5-nano",
    );
    expect(parsed.promptTokens).toBe(100);
    expect(parsed.completionTokens).toBe(20);
  });

  it("accepts the inputTokens and outputTokens spelling too", () => {
    const parsed = usageFromResult(
      { usage: { inputTokens: 7, outputTokens: 3 } },
      "openai/gpt-5-nano",
    );
    expect(parsed.promptTokens).toBe(7);
    expect(parsed.completionTokens).toBe(3);
  });

  it("prefers the cost the gateway reported over its own estimate", () => {
    const parsed = usageFromResult(
      { usage: { promptTokens: 1_000_000, completionTokens: 0, cost: 0.5 } },
      "openai/gpt-5-nano",
    );
    expect(parsed.costUsd).toBe(0.5);
  });

  it("estimates the cost from the price table when the gateway reports none", () => {
    const parsed = usageFromResult(
      { usage: { promptTokens: 1_000_000, completionTokens: 0 } },
      "openai/gpt-5-nano",
    );
    expect(parsed.costUsd).toBeCloseTo(0.05, 10);
  });

  it("returns zeros when the response carries no usage block at all", () => {
    const parsed = usageFromResult({}, "openai/gpt-5-nano");
    expect(parsed).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
    });
  });
});

describe("logUsage (covers: AC-4)", () => {
  it("writes one row carrying the student, task, model, tokens and XAF", async () => {
    await logUsage({
      userId: "student-1",
      task: "grading",
      modelId: "openai/gpt-5-nano",
      promptTokens: 1000,
      completionTokens: 200,
      costUsd: 0.002,
      latencyMs: 900,
    });

    expect(events.create).toHaveBeenCalledTimes(1);
    const data = events.create.mock.calls[0][0].data;
    expect(data.userId).toBe("student-1");
    expect(data.task).toBe("grading");
    expect(data.modelId).toBe("openai/gpt-5-nano");
    expect(data.promptTokens).toBe(1000);
    expect(data.costXaf).toBeGreaterThan(0);
  });

  it("attributes the row to the student, so per student cost is readable", async () => {
    await logUsage({
      userId: "student-42",
      task: "quiz_gen",
      modelId: "google/gemini-3.7-flash",
      costUsd: 0.001,
    });
    expect(events.create.mock.calls[0][0].data.userId).toBe("student-42");
  });

  it("keeps a row anonymous when no student is known, such as admin content work", async () => {
    await logUsage({ task: "summarize", modelId: "a/model", costUsd: 0 });
    expect(events.create.mock.calls[0][0].data.userId).toBeNull();
  });

  it("copies the rate onto the row so historic rows keep their own rate", async () => {
    await logUsage({
      task: "grading",
      modelId: "a/model",
      costUsd: 0.001,
      usdToXafRate: 700,
    });
    const data = events.create.mock.calls[0][0].data;
    expect(data.usdToXafRate).toBe(700);
    expect(data.costXaf).toBe(1);
  });

  it("reads the rate from platform settings when none is passed", async () => {
    settings.findUnique.mockResolvedValue({ usdToXafRate: 800 });
    await logUsage({ task: "grading", modelId: "a/model", costUsd: 0.001 });
    expect(events.create.mock.calls[0][0].data.usdToXafRate).toBe(800);
  });

  it("falls back to the default rate when settings have none", async () => {
    await logUsage({ task: "grading", modelId: "a/model", costUsd: 0.001 });
    expect(events.create.mock.calls[0][0].data.usdToXafRate).toBe(
      DEFAULT_USD_TO_XAF_RATE,
    );
  });

  it("records a zero cost failed call rather than dropping the evidence", async () => {
    await logUsage({
      task: "grading",
      modelId: "a/model",
      costUsd: 0,
      errorCode: "all_open",
    });
    const data = events.create.mock.calls[0][0].data;
    expect(data.costXaf).toBe(0);
    expect(data.errorCode).toBe("all_open");
  });

  it("never fails the student request when the ledger write fails", async () => {
    events.create.mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      logUsage({ task: "grading", modelId: "a/model", costUsd: 0.01 }),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe("doualaDay", () => {
  it("buckets a late evening UTC timestamp onto the next Douala day", () => {
    expect(doualaDay(new Date("2026-10-12T23:30:00.000Z"))).toBe("2026-10-13");
  });

  it("keeps a midday timestamp on the same Douala day", () => {
    expect(doualaDay(new Date("2026-10-12T12:00:00.000Z"))).toBe("2026-10-12");
  });

  it("buckets an early morning UTC timestamp onto the same Douala day", () => {
    expect(doualaDay(new Date("2026-10-12T00:30:00.000Z"))).toBe("2026-10-12");
  });
});

describe("dailyTotals (covers: AC-4)", () => {
  it("sums calls, tokens and XAF into one row per day", async () => {
    events.findMany.mockResolvedValue([
      {
        costXaf: 1,
        costUsd: 0.001,
        usdToXafRate: 650,
        promptTokens: 100,
        completionTokens: 50,
        createdAt: new Date("2026-10-12T09:00:00.000Z"),
      },
      {
        costXaf: 2,
        costUsd: 0.001,
        usdToXafRate: 650,
        promptTokens: 200,
        completionTokens: 25,
        createdAt: new Date("2026-10-12T15:00:00.000Z"),
      },
    ]);

    const totals = await dailyTotals(
      "student-1",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-13T00:00:00.000Z"),
    );

    expect(totals).toEqual([
      { day: "2026-10-12", calls: 2, tokens: 375, costXaf: 2 },
    ]);
  });

  it("does not round each call up to a whole franc, which would inflate the total", async () => {
    // Ten calls at 0.39 XAF each cost 3.9 XAF. Rounding each row to 1 XAF and
    // adding would report 10.
    events.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => ({
        costXaf: 1,
        costUsd: 0.0006,
        usdToXafRate: 650,
        promptTokens: 4000,
        completionTokens: 1000,
        createdAt: new Date("2026-10-12T09:00:00.000Z"),
      })),
    );

    const totals = await dailyTotals(
      "student-1",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-13T00:00:00.000Z"),
    );

    expect(totals[0].costXaf).toBe(4);
  });

  it("scopes the query to the student, so one student never sees another's spend", async () => {
    await dailyTotals(
      "student-1",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-13T00:00:00.000Z"),
    );
    expect(events.findMany.mock.calls[0][0].where.userId).toBe("student-1");
  });

  it("returns an empty list when the student has no AI spend yet", async () => {
    events.findMany.mockResolvedValue([]);
    await expect(
      dailyTotals(
        "student-1",
        new Date("2026-10-12T00:00:00.000Z"),
        new Date("2026-10-13T00:00:00.000Z"),
      ),
    ).resolves.toEqual([]);
  });

  it("keeps separate buckets for separate days", async () => {
    events.findMany.mockResolvedValue([
      {
        costXaf: 1,
        costUsd: 0.001,
        usdToXafRate: 650,
        promptTokens: 10,
        completionTokens: 0,
        createdAt: new Date("2026-10-11T09:00:00.000Z"),
      },
      {
        costXaf: 2,
        costUsd: 0.001,
        usdToXafRate: 650,
        promptTokens: 20,
        completionTokens: 0,
        createdAt: new Date("2026-10-12T09:00:00.000Z"),
      },
    ]);

    const totals = await dailyTotals(
      "student-1",
      new Date("2026-10-11T00:00:00.000Z"),
      new Date("2026-10-13T00:00:00.000Z"),
    );

    expect(totals.map((t) => t.day)).toEqual(["2026-10-11", "2026-10-12"]);
  });

  it("counts a zero cost failed call, so outages still show against a student", async () => {
    events.findMany.mockResolvedValue([
      {
        costXaf: 0,
        costUsd: 0,
        usdToXafRate: 650,
        promptTokens: 0,
        completionTokens: 0,
        createdAt: new Date("2026-10-12T09:00:00.000Z"),
      },
    ]);
    const totals = await dailyTotals(
      "student-1",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-13T00:00:00.000Z"),
    );
    expect(totals[0].calls).toBe(1);
    expect(totals[0].costXaf).toBe(0);
  });
});
