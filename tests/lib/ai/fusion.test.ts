import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fusionAllowed, runFusionResearch } from "@/lib/ai/fusion";
import { logUsage } from "@/lib/ai/usage";

vi.mock("ai", () => ({ generateText: vi.fn() }));

vi.mock("@/lib/ai/usage", () => ({
  logUsage: vi.fn(async () => {}),
  usageFromResult: vi.fn(() => ({
    promptTokens: 10,
    completionTokens: 5,
    costUsd: 0.01,
  })),
}));

const original = process.env.AI_FUSION_ALLOW;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_FUSION_ALLOW;
  vi.mocked(generateText).mockResolvedValue({ text: "consensus" } as never);
});

afterEach(() => {
  if (original === undefined) delete process.env.AI_FUSION_ALLOW;
  else process.env.AI_FUSION_ALLOW = original;
});

describe("fusionAllowed", () => {
  it("is off by default, so everyday study never pays consensus pricing", () => {
    expect(fusionAllowed()).toBe(false);
  });

  it("turns on only for the exact flag value", () => {
    process.env.AI_FUSION_ALLOW = "1";
    expect(fusionAllowed()).toBe(true);
  });

  it("stays off for any other value", () => {
    process.env.AI_FUSION_ALLOW = "true";
    expect(fusionAllowed()).toBe(false);
  });
});

describe("runFusionResearch gating", () => {
  it("refuses to run when the flag is off, even for an admin", async () => {
    await expect(
      runFusionResearch({ prompt: "deep dive", isAdmin: true }),
    ).rejects.toThrow("Fusion is off");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("refuses a non admin caller even when the flag is on", async () => {
    process.env.AI_FUSION_ALLOW = "1";

    await expect(runFusionResearch({ prompt: "deep dive" })).rejects.toThrow(
      "admin only",
    );
    expect(generateText).not.toHaveBeenCalled();
  });

  it("runs for an admin once both the flag and the role allow it", async () => {
    process.env.AI_FUSION_ALLOW = "1";

    const result = await runFusionResearch({
      prompt: "deep dive",
      isAdmin: true,
    });

    expect(result.text).toBe("consensus");
    expect(result.modelId).toBe("openrouter/fusion");
  });
});

describe("runFusionResearch accounting (covers: AC-4)", () => {
  it("logs its cost under its own task so it never hides inside tutoring spend", async () => {
    process.env.AI_FUSION_ALLOW = "1";

    await runFusionResearch({ prompt: "p", isAdmin: true, userId: "admin-1" });

    const call = vi.mocked(logUsage).mock.calls[0][0];
    expect(call.task).toBe("fusion_research");
    expect(call.modelId).toBe("openrouter/fusion");
    expect(call.userId).toBe("admin-1");
  });

  it("does not let the SDK retry a consensus call on its own", async () => {
    process.env.AI_FUSION_ALLOW = "1";
    await runFusionResearch({ prompt: "p", isAdmin: true });
    expect(vi.mocked(generateText).mock.calls[0][0].maxRetries).toBe(0);
  });
});
