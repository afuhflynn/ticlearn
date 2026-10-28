import { generateObject, generateText, streamText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  generate,
  generateCritical,
  generateTextCritical,
  generateTextWithFallback,
  streamChat,
} from "@/lib/ai/orchestrator";
import { logUsage } from "@/lib/ai/usage";
import { clearMemory } from "@/lib/cache";
import { noteColdStart } from "@/lib/cache/cold-start";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/cache/cold-start", () => ({
  noteColdStart: vi.fn(() => false),
}));

vi.mock("@/lib/ai/usage", () => ({
  usageFromResult: vi.fn(() => ({
    promptTokens: 10,
    completionTokens: 5,
    costUsd: 0.001,
  })),
  logUsage: vi.fn(async () => {}),
}));

const schema = z.object({ ok: z.boolean() });
const ref = { name: "study_brief", version: 2, model: "gemini-2.5-flash" };

function mockGenerateObject(payload: unknown = { ok: true }) {
  vi.mocked(generateObject).mockResolvedValue({ object: payload } as never);
}

beforeEach(() => {
  clearMemory();
  vi.clearAllMocks();
  vi.mocked(logUsage).mockClear();
  vi.mocked(noteColdStart).mockReturnValue(false);
  mockGenerateObject();
  vi.mocked(generateText).mockResolvedValue({ text: "answer" } as never);
});

describe("orchestrator file span wins (covers: spec standard file span wins)", () => {
  it("caches the second identical call under the file span", async () => {
    const first = await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: ref,
    });
    const second = await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: ref,
    });
    expect(first.object).toEqual({ ok: true });
    expect(second.object).toEqual({ ok: true });
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it("never caches when the file span is zero, so marking stays fresh", async () => {
    await generate({
      task: "grading",
      schema,
      prompt: "mark this",
      cacheTtlMs: 0,
      promptRef: {
        name: "grade_open_answer",
        version: 1,
        model: "gemini-2.5-flash",
      },
    });
    await generate({
      task: "grading",
      schema,
      prompt: "mark this",
      cacheTtlMs: 0,
      promptRef: {
        name: "grade_open_answer",
        version: 1,
        model: "gemini-2.5-flash",
      },
    });
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("falls back to the registry span when no file span travels along", async () => {
    await generate({ task: "quiz_gen", schema, prompt: "hello" });
    await generate({ task: "quiz_gen", schema, prompt: "hello" });
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it("treats a version bump as a new cache key (covers: AC-3)", async () => {
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: ref,
    });
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: { ...ref, version: 3 },
    });
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("expires entries when the file span passes", async () => {
    vi.useFakeTimers();
    try {
      await generate({
        task: "quiz_gen",
        schema,
        prompt: "hello",
        cacheTtlMs: 1000,
        promptRef: ref,
      });
      await vi.advanceTimersByTimeAsync(1001);
      await generate({
        task: "quiz_gen",
        schema,
        prompt: "hello",
        cacheTtlMs: 1000,
        promptRef: ref,
      });
      expect(generateObject).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the critical twin on the same file span behavior", async () => {
    await generateCritical({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: ref,
    });
    await generateCritical({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60000,
      promptRef: ref,
    });
    expect(generateObject).toHaveBeenCalledTimes(1);
  });
});

describe("orchestrator prompt trace logs (covers: spec standard traceability)", () => {
  it("logs name plus version plus model with no prompt text", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      await generate({
        task: "summarize",
        schema,
        prompt: "SECRET_STUDENT_WORDS",
        cacheTtlMs: 0,
        promptRef: ref,
      });
      const lines = debugSpy.mock.calls.map((c) => String(c[0]));
      const line = lines.find((l) => l.includes("study_brief"));
      expect(line).toContain("study_brief");
      expect(line).toContain("v2");
      expect(line).toContain("gemini-2.5-flash");
      expect(lines.join("\n")).not.toContain("SECRET_STUDENT_WORDS");
    } finally {
      debugSpy.mockRestore();
    }
  });

  it("logs the ref on the text and chat paths too", async () => {
    vi.mocked(generateText).mockResolvedValue({ text: "t" } as never);
    vi.mocked(streamText).mockReturnValue({
      textStream: {
        // eslint-disable-next-line require-yield
        async *[Symbol.asyncIterator]() {
          yield "hi";
        },
      },
    } as never);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      await generateTextWithFallback({
        task: "fast_chat",
        prompt: "p",
        promptRef: ref,
      });
      await generateTextCritical({
        task: "fast_chat",
        prompt: "p",
        promptRef: ref,
      });
      await streamChat({ task: "fast_chat", messages: [], promptRef: ref });
      const lines = debugSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.filter((l) => l.includes("study_brief")).length).toBe(3);
    } finally {
      debugSpy.mockRestore();
    }
  });
});

describe("orchestrator task registry guard", () => {
  it("throws on an unknown task name", async () => {
    await expect(
      generate({ task: "nope", schema, prompt: "x" }),
    ).rejects.toThrow(/Unknown task/);
  });
});

describe("streamChat Muse-first fallback", () => {
  it("falls through to OpenRouter when Muse cannot produce a first token", async () => {
    let calls = 0;
    vi.mocked(streamText).mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return {
          textStream: {
            // eslint-disable-next-line require-yield
            async *[Symbol.asyncIterator]() {},
          },
        } as never;
      }
      return {
        textStream: {
          // eslint-disable-next-line require-yield
          async *[Symbol.asyncIterator]() {
            yield "fallback answer";
          },
        },
      } as never;
    });
    const result = await streamChat({
      task: "fast_chat",
      messages: [],
      promptRef: ref,
    });
    expect(result).toBeDefined();
    expect(calls).toBeGreaterThan(1);
  });
});

describe("orchestrator cold start tracking", () => {
  it("counts every request toward warm up, not just cache hits", async () => {
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60_000,
      promptRef: ref,
    });
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60_000,
      promptRef: ref,
    });
    // First call is a miss (empty memory), second is a hit. Without the fix
    // noteColdStart only fires on the hit, so the count would be one instead
    // of two.
    expect(noteColdStart).toHaveBeenCalledTimes(2);
  });

  it("passes coldStart true to logUsage on a generate cache miss", async () => {
    vi.mocked(noteColdStart).mockReturnValue(true);
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60_000,
      promptRef: ref,
    });
    const call = vi.mocked(logUsage).mock.calls.at(-1)?.[0];
    expect(call?.coldStart).toBe(true);
  });

  it("passes coldStart true to logUsage on a generate cache hit", async () => {
    vi.mocked(noteColdStart).mockReturnValue(true);
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60_000,
      promptRef: ref,
    });
    await generate({
      task: "quiz_gen",
      schema,
      prompt: "hello",
      cacheTtlMs: 60_000,
      promptRef: ref,
    });
    const hitCalls = vi
      .mocked(logUsage)
      .mock.calls.map((call) => call[0])
      .filter((row) => row.cacheHit === true);
    expect(hitCalls).toHaveLength(1);
    expect(hitCalls[0].coldStart).toBe(true);
  });

  it("streamChat calls noteColdStart once per request", async () => {
    vi.mocked(streamText).mockReturnValue({
      textStream: {
        // eslint-disable-next-line require-yield
        async *[Symbol.asyncIterator]() {
          yield "hi";
        },
      },
    } as never);
    await streamChat({ task: "fast_chat", messages: [], promptRef: ref });
    expect(noteColdStart).toHaveBeenCalledTimes(1);
  });

  it("streamChat passes coldStart to logUsage on finish", async () => {
    vi.mocked(noteColdStart).mockReturnValue(true);
    vi.mocked(streamText).mockImplementation(((opts: {
      onFinish?: (finish: { text: string; usage: unknown }) => void;
    }) => {
      opts?.onFinish?.({ text: "hi", usage: {} });
      return {
        textStream: {
          // eslint-disable-next-line require-yield
          async *[Symbol.asyncIterator]() {
            yield "hi";
          },
        },
      };
    }) as never);
    await streamChat({ task: "fast_chat", messages: [], promptRef: ref });
    const finishCalls = vi
      .mocked(logUsage)
      .mock.calls.map((call) => call[0])
      .filter((row) => row.coldStart === true && row.cacheHit !== true);
    expect(finishCalls).toHaveLength(1);
  });

  it("generateTextWithFallback calls noteColdStart once per request", async () => {
    vi.mocked(generateText).mockResolvedValue({ text: "answer" } as never);
    await generateTextWithFallback({ task: "fast_chat", prompt: "hi" });
    expect(noteColdStart).toHaveBeenCalledTimes(1);
  });

  it("generateTextWithFallback passes coldStart to logUsage on success", async () => {
    vi.mocked(noteColdStart).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue({ text: "answer" } as never);
    await generateTextWithFallback({ task: "fast_chat", prompt: "hi" });
    const call = vi.mocked(logUsage).mock.calls.at(-1)?.[0];
    expect(call?.coldStart).toBe(true);
  });
});
