import { generateObject, generateText, streamText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clearCache } from "@/lib/ai/cache";
import {
  generate,
  generateCritical,
  generateTextCritical,
  generateTextWithFallback,
  streamChat,
} from "@/lib/ai/orchestrator";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

const schema = z.object({ ok: z.boolean() });
const ref = { name: "study_brief", version: 2, model: "gemini-2.5-flash" };

function mockGenerateObject(payload: unknown = { ok: true }) {
  vi.mocked(generateObject).mockResolvedValue({ object: payload } as never);
}

beforeEach(() => {
  clearCache();
  vi.clearAllMocks();
  mockGenerateObject();
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
    vi.mocked(streamText).mockReturnValue({ chunks: [] } as never);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      await generateTextWithFallback({
        task: "reasoning",
        prompt: "p",
        promptRef: ref,
      });
      await generateTextCritical({
        task: "reasoning",
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
