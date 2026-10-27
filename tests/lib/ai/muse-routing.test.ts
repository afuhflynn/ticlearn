import { generateObject } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { chainMuse } from "@/lib/ai/chain";
import { generate } from "@/lib/ai/orchestrator";
import { taskRegistry } from "@/lib/ai/registry";
import { clearMemory } from "@/lib/cache";

const schema = z.object({ ok: z.boolean() });

function envWith(keys: Record<string, string | undefined>) {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(keys)) {
    original[key] = process.env[key];
    if (keys[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = keys[key];
    }
  }
  return () => {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  };
}

beforeEach(() => {
  clearMemory();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("muse routing (covers: AC-1, AC-2, AC-3, AC-4)", () => {
  it("chainMuse returns a model for muse-spark-1.3 when MUSE_API_KEY is set", () => {
    const restore = envWith({ MUSE_API_KEY: "meta-key-123" });
    try {
      const model = chainMuse("muse-spark-1.3");
      expect(model).toBeDefined();
    } finally {
      restore();
    }
  });

  it("chainMuse returns a model for meta-models/muse-spark-open-1026 when BAASETEN_API_KEY is set", () => {
    const restore = envWith({ BAASETEN_API_KEY: "baseten-key-456" });
    try {
      const model = chainMuse("meta-models/muse-spark-open-1026");
      expect(model).toBeDefined();
    } finally {
      restore();
    }
  });

  it("chainMuse throws when MUSE_API_KEY is missing for a Meta model", async () => {
    vi.resetModules();
    const restore = envWith({
      MUSE_API_KEY: undefined,
      BAASETEN_API_KEY: undefined,
    });
    try {
      const { chainMuse: freshChainMuse } = await import("@/lib/ai/chain");
      expect(() => freshChainMuse("muse-spark-1.3")).toThrow(/MUSE_API_KEY/);
    } finally {
      restore();
    }
  });

  it("chainMuse throws when BAASETEN_API_KEY is missing for a Baseten model", async () => {
    vi.resetModules();
    const restore = envWith({
      MUSE_API_KEY: undefined,
      BAASETEN_API_KEY: undefined,
    });
    try {
      const { chainMuse: freshChainMuse } = await import("@/lib/ai/chain");
      expect(() => freshChainMuse("meta-models/muse-spark-open-1026")).toThrow(
        /BAASETEN_API_KEY/,
      );
    } finally {
      restore();
    }
  });
});

describe("registry provider field (covers: AC-9)", () => {
  it("course_analysis is a meta task with a single model chain and no cache", () => {
    const task = taskRegistry.course_analysis;
    expect(task.provider).toBe("meta");
    expect(task.chain).toEqual(["muse-spark-1.3"]);
    expect(task.cacheTtlMs).toBe(0);
  });

  it("question_gen is a meta task with caching enabled", () => {
    const task = taskRegistry.question_gen;
    expect(task.provider).toBe("meta");
    expect(task.chain).toEqual(["muse-spark-1.3"]);
    expect(task.cacheTtlMs).toBeGreaterThan(0);
  });

  it("answer_evaluation and next_step are meta tasks never cached", () => {
    expect(taskRegistry.answer_evaluation.provider).toBe("meta");
    expect(taskRegistry.answer_evaluation.cacheTtlMs).toBe(0);
    expect(taskRegistry.next_step.provider).toBe("meta");
    expect(taskRegistry.next_step.cacheTtlMs).toBe(0);
  });

  it("visual_analysis is a baseten task with the muse-spark-open model", () => {
    expect(taskRegistry.visual_analysis.provider).toBe("baseten");
    expect(taskRegistry.visual_analysis.chain).toEqual([
      "meta-models/muse-spark-open-1026",
    ]);
    expect(taskRegistry.visual_analysis.cacheTtlMs).toBe(0);
    expect(taskRegistry.visual_analysis.requiresMultimodal).toBe(true);
  });
});

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/ai/breaker", () => ({
  splitChain: vi.fn(async () => ({
    runnable: ["nvidia/nemotron-3.5-super-vl:free"],
    skipped: [],
  })),
  recordSuccess: vi.fn(async () => {}),
  recordTransportFailure: vi.fn(async () => {}),
  markProbeStart: vi.fn(() => true),
  markProbeDone: vi.fn(),
}));

vi.mock("@/lib/ai/usage", () => ({
  usageFromResult: vi.fn(() => ({
    promptTokens: 10,
    completionTokens: 5,
    costUsd: 0,
  })),
  logUsage: vi.fn(async () => {}),
}));

describe("orchestrator Muse fallback (covers: AC-5, AC-8)", () => {
  it("OpenRouter tasks are unaffected when no Muse keys are set", async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: { ok: true },
      usage: { promptTokens: 10, completionTokens: 5 },
    } as never);

    const restore = envWith({
      OPENROUTER_API_KEY: "or-key",
      MUSE_API_KEY: undefined,
      BAASETEN_API_KEY: undefined,
    });
    try {
      const result = await generate({
        task: "grading",
        schema,
        prompt: "mark this",
        cacheTtlMs: 0,
      });
      expect(result.object).toEqual({ ok: true });
      expect(result.fromCache).toBe(false);
    } finally {
      restore();
    }
  });

  it("Muse task falls through to OpenRouter when Muse key is missing", async () => {
    vi.mocked(generateObject).mockResolvedValue({
      object: { ok: true },
      usage: { promptTokens: 10, completionTokens: 5 },
    } as never);

    const restore = envWith({
      OPENROUTER_API_KEY: "or-key",
      MUSE_API_KEY: undefined,
      BAASETEN_API_KEY: undefined,
    });
    try {
      const result = await generate({
        task: "course_analysis",
        schema,
        prompt: "analyse this course",
        cacheTtlMs: 0,
      });
      expect(result.object).toEqual({ ok: true });
    } finally {
      restore();
    }
  });
});
