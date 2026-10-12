import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  markProbeDone,
  markProbeStart,
  readHealth,
  recordSuccess,
  recordTransportFailure,
  splitChain,
} from "@/lib/ai/breaker";
import { COOLDOWN_MS, TRIP_THRESHOLD } from "@/lib/ai/chain";
import { prisma } from "@/lib/prisma";

const health = prisma.aiModelHealth as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    modelId: "test/model",
    status: "healthy",
    failCount: 0,
    trippedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  health.findMany.mockResolvedValue([]);
  health.findUnique.mockResolvedValue(null);
  health.upsert.mockResolvedValue({});
});

describe("readHealth", () => {
  it("maps stored rows into a lookup keyed by model id", async () => {
    health.findMany.mockResolvedValue([
      row({ modelId: "a/one", status: "open", failCount: 3 }),
      row({ modelId: "b/two", status: "healthy", failCount: 0 }),
    ]);

    const map = await readHealth();

    expect(map.get("a/one")?.status).toBe("open");
    expect(map.get("b/two")?.status).toBe("healthy");
  });

  it("fails open with an empty map when the read throws, so the head is still tried", async () => {
    health.findMany.mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(readHealth()).resolves.toEqual(new Map());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("converts a tripped timestamp to epoch milliseconds", async () => {
    const at = new Date("2026-10-12T10:00:00.000Z");
    health.findMany.mockResolvedValue([row({ status: "open", trippedAt: at })]);
    const map = await readHealth();
    expect(map.get("test/model")?.trippedAt).toBe(at.getTime());
  });
});

describe("splitChain (covers: AC-2)", () => {
  it("keeps every model runnable when nothing is known about them", async () => {
    const verdict = await splitChain(["a/one", "b/two"]);
    expect(verdict.runnable).toEqual(["a/one", "b/two"]);
    expect(verdict.skipped).toEqual([]);
  });

  it("skips a tripped model that is still inside its cool down", async () => {
    health.findMany.mockResolvedValue([
      row({ modelId: "a/one", status: "open", trippedAt: new Date() }),
    ]);

    const verdict = await splitChain(["a/one", "b/two"]);

    expect(verdict.skipped).toEqual(["a/one"]);
    expect(verdict.runnable).toEqual(["b/two"]);
  });

  it("lets a tripped model back in once the cool down has passed, as a single probe", async () => {
    const longAgo = new Date(Date.now() - COOLDOWN_MS - 1000);
    health.findMany.mockResolvedValue([
      row({ modelId: "a/one", status: "open", trippedAt: longAgo }),
    ]);

    const verdict = await splitChain(["a/one"]);

    expect(verdict.runnable).toEqual(["a/one"]);
    expect(verdict.skipped).toEqual([]);
  });

  it("holds a tripped model back while another probe is already in flight", async () => {
    const longAgo = new Date(Date.now() - COOLDOWN_MS - 1000);
    health.findMany.mockResolvedValue([
      row({ modelId: "a/one", status: "open", trippedAt: longAgo }),
    ]);
    markProbeStart("a/one");

    const verdict = await splitChain(["a/one"]);
    expect(verdict.skipped).toEqual(["a/one"]);

    markProbeDone("a/one");
  });

  it("preserves chain order among the runnable models", async () => {
    const verdict = await splitChain(["a/one", "b/two", "c/three"]);
    expect(verdict.runnable).toEqual(["a/one", "b/two", "c/three"]);
  });
});

describe("probe single flight", () => {
  it("lets exactly one probe start for a model", () => {
    markProbeDone("x/model");
    expect(markProbeStart("x/model")).toBe(true);
    expect(markProbeStart("x/model")).toBe(false);
    markProbeDone("x/model");
  });

  it("allows a new probe once the previous one finishes", () => {
    markProbeDone("y/model");
    markProbeStart("y/model");
    markProbeDone("y/model");
    expect(markProbeStart("y/model")).toBe(true);
    markProbeDone("y/model");
  });
});

describe("recordTransportFailure (covers: AC-2, AC-3)", () => {
  it("stays healthy below the trip threshold", async () => {
    health.findUnique.mockResolvedValue(row({ failCount: 0 }));

    await recordTransportFailure("test/model");

    expect(health.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "healthy", failCount: 1 }),
      }),
    );
  });

  it("opens the breaker and clears the counter on the threshold failure", async () => {
    health.findUnique.mockResolvedValue(row({ failCount: TRIP_THRESHOLD - 1 }));

    await recordTransportFailure("test/model");

    const call = health.upsert.mock.calls[0][0];
    expect(call.update.status).toBe("open");
    expect(call.update.failCount).toBe(0);
    expect(call.update.trippedAt).toBeInstanceOf(Date);
  });

  it("carries the trip threshold from the chain config", () => {
    expect(TRIP_THRESHOLD).toBe(3);
  });

  it("counts up across separate failures instead of resetting each time", async () => {
    health.findUnique.mockResolvedValue(row({ failCount: 1 }));
    await recordTransportFailure("test/model");
    expect(health.upsert.mock.calls[0][0].update.failCount).toBe(2);
  });

  it("never reopens a model that already has a trip time", async () => {
    const at = new Date();
    health.findUnique.mockResolvedValue(row({ failCount: 0, trippedAt: at }));
    await recordTransportFailure("test/model");
    expect(health.upsert.mock.calls[0][0].update.trippedAt).toEqual(at);
  });

  it("swallows a write failure rather than failing the student request", async () => {
    health.findUnique.mockResolvedValue(null);
    health.upsert.mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(recordTransportFailure("test/model")).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe("recordSuccess", () => {
  it("closes an open breaker and clears the counter", async () => {
    await recordSuccess("test/model");
    expect(health.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: "healthy", failCount: 0, trippedAt: null },
      }),
    );
  });

  it("swallows a write failure rather than failing the student request", async () => {
    health.upsert.mockRejectedValue(new Error("db down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(recordSuccess("test/model")).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
