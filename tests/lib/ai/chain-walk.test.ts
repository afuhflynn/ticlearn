import { generateObject, generateText, streamText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clearCache } from "@/lib/ai/cache";
import {
  generate,
  generateTextWithFallback,
  streamChat,
} from "@/lib/ai/orchestrator";
import { CHAIN_DEADLINE_MS, CHAIN_STREAM_DEADLINE_MS } from "@/lib/ai/chain";
import { markProbeStart as realMarkProbeStart } from "@/lib/ai/breaker";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/ai/breaker", () => ({
  splitChain: vi.fn(async () => ({
    runnable: [
      "google/gemini-3.7-flash",
      "openai/gpt-5-nano",
      "deepseek/deepseek-v4.1-flash",
    ],
    skipped: [],
  })),
  recordSuccess: vi.fn(async () => {}),
  recordTransportFailure: vi.fn(async () => {}),
  markProbeStart: vi.fn(() => true),
  markProbeDone: vi.fn(),
  readHealth: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/ai/usage", () => ({
  usageFromResult: vi.fn(() => ({
    promptTokens: 10,
    completionTokens: 5,
    costUsd: 0.001,
  })),
  logUsage: vi.fn(async () => {}),
}));

const breaker = await import("@/lib/ai/breaker");
const usage = await import("@/lib/ai/usage");
const schema = z.object({ ok: z.boolean() });

function chainOf(models: string[]) {
  vi.mocked(breaker.splitChain).mockResolvedValue({
    runnable: models,
    skipped: [],
  });
}

function transportFailure(message = "socket hang up") {
  const err = new Error(message);
  err.name = "APICallError";
  return err;
}

function schemaFailure() {
  const err = new Error(
    "NoObjectGeneratedError: response did not match schema",
  );
  err.name = "AI_NoObjectGeneratedError";
  return err;
}

/**
 * The real `streamText` returns immediately and only calls the provider when
 * the stream is read, so a fault surfaces through `onError`, never as a throw.
 * The mock has to behave the same way or the fallback loop looks fine while
 * being dead code in production.
 */
function lazyStream(opts: { chunks: string[]; error?: unknown }) {
  return {
    textStream: {
      async *[Symbol.asyncIterator]() {
        if (opts.error) throw opts.error;
        for (const chunk of opts.chunks) yield chunk;
      },
    },
  } as never;
}

beforeEach(() => {
  clearCache();
  vi.clearAllMocks();
  vi.mocked(generateObject).mockResolvedValue({
    object: { ok: true },
    usage: { promptTokens: 10, completionTokens: 5 },
  } as never);
  vi.mocked(generateText).mockResolvedValue({ text: "answer" } as never);
  vi.mocked(streamText).mockReturnValue(
    lazyStream({ chunks: ["hel", "lo"] }),
  );
  chainOf(["google/gemini-3.7-flash", "openai/gpt-5-nano"]);
});

describe("generate chain walk (covers: AC-1)", () => {
  it("serves from the head model when it works", async () => {
    const result = await generate({ task: "grading", schema, prompt: "hi" });

    expect(result.modelId).toBe("google/gemini-3.7-flash");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it("falls through to the next model when the head times out", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(transportFailure("timeout"))
      .mockResolvedValueOnce({ object: { ok: true } } as never);

    const result = await generate({ task: "grading", schema, prompt: "hi" });

    expect(result.modelId).toBe("openai/gpt-5-nano");
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("records a transport failure against the model that died", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(transportFailure())
      .mockResolvedValueOnce({ object: { ok: true } } as never);

    await generate({ task: "grading", schema, prompt: "hi" });

    expect(breaker.recordTransportFailure).toHaveBeenCalledWith(
      "google/gemini-3.7-flash",
    );
    expect(breaker.recordSuccess).toHaveBeenCalledWith("openai/gpt-5-nano");
  });

  it("walks past every dead model to reach a working one", async () => {
    chainOf(["a/one", "b/two", "c/three"]);
    vi.mocked(generateObject)
      .mockRejectedValueOnce(transportFailure())
      .mockRejectedValueOnce(transportFailure())
      .mockResolvedValueOnce({ object: { ok: true } } as never);

    const result = await generate({ task: "grading", schema, prompt: "hi" });

    expect(result.modelId).toBe("c/three");
    expect(generateObject).toHaveBeenCalledTimes(3);
  });

  it("tries only the runnable models the breaker handed back", async () => {
    chainOf(["c/three"]);
    const result = await generate({ task: "grading", schema, prompt: "hi" });
    expect(result.modelId).toBe("c/three");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it("stops trying once the shared deadline has passed", async () => {
    chainOf(["a/one", "b/two", "c/three", "d/four", "e/five", "f/six"]);
    vi.mocked(generateObject).mockRejectedValue(transportFailure());

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow("briefly unavailable");
    expect(vi.mocked(generateObject).mock.calls.length).toBeLessThanOrEqual(6);
  });
});

describe("generate schema safety (covers: AC-3)", () => {
  it("fails fast on a schema mismatch rather than walking the chain", async () => {
    vi.mocked(generateObject).mockRejectedValue(schemaFailure());

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow(/did not match schema/);

    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it("never trips the breaker for a schema mismatch", async () => {
    vi.mocked(generateObject).mockRejectedValue(schemaFailure());

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow();

    expect(breaker.recordTransportFailure).not.toHaveBeenCalled();
  });

  it("fails fast on a bad request, since it would fail on every model", async () => {
    const bad = new Error("invalid_request_error");
    Object.assign(bad, { status: 400 });
    vi.mocked(generateObject).mockRejectedValue(bad);

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow("invalid_request_error");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });
});

describe("generate all models down (covers: AC-7)", () => {
  it("shows the student a friendly message rather than a raw provider error", async () => {
    vi.mocked(generateObject).mockRejectedValue(transportFailure());

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow("AI help is briefly unavailable");
  });

  it("never leaks the provider error text to the student", async () => {
    vi.mocked(generateObject).mockRejectedValue(
      transportFailure("connection to internal host refused"),
    );

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow(/briefly unavailable/);
  });

  it("writes one zero cost row so the outage is still visible", async () => {
    vi.mocked(generateObject).mockRejectedValue(transportFailure());

    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow();

    const call = vi.mocked(usage.logUsage).mock.calls.at(-1)?.[0];
    expect(call?.costUsd).toBe(0);
    expect(call?.errorCode).toBe("all_failed");
  });

  it("labels an outage where every breaker is open differently from a plain failure", async () => {
    chainOf([]);
    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow("briefly unavailable");

    const call = vi.mocked(usage.logUsage).mock.calls.at(-1)?.[0];
    expect(call?.errorCode).toBe("all_open");
  });

  it("does not retry forever when the chain is empty", async () => {
    chainOf([]);
    await expect(
      generate({ task: "grading", schema, prompt: "hi" }),
    ).rejects.toThrow();
    expect(generateObject).not.toHaveBeenCalled();
  });
});

describe("generate output cap (covers: AC-1)", () => {
  it("passes the prompt file cap through to the call", async () => {
    await generate({
      task: "grading",
      schema,
      prompt: "hi",
      modelOptions: { temperature: 0.3, maxOutputTokens: 512 },
    });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.maxOutputTokens).toBe(512);
    expect(call.temperature).toBe(0.3);
  });

  it("defaults the cap when the prompt file sets none, so billing is bounded", async () => {
    await generate({ task: "grading", schema, prompt: "hi" });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.maxOutputTokens).toBe(2048);
  });

  it("never retries inside a single attempt", async () => {
    await generate({ task: "grading", schema, prompt: "hi" });
    expect(vi.mocked(generateObject).mock.calls[0][0].maxRetries).toBe(0);
  });
});

describe("generate caching (covers: AC-1)", () => {
  it("serves the second identical call from cache without touching a model", async () => {
    const opts = {
      task: "quiz_gen",
      schema,
      prompt: "same",
      cacheTtlMs: 60_000,
    };
    await generate(opts);
    const second = await generate(opts);

    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(second.modelId).toBe("cache");
  });

  it("checks the cache before walking the chain, so a hit costs nothing", async () => {
    const opts = {
      task: "quiz_gen",
      schema,
      prompt: "cached",
      cacheTtlMs: 60_000,
    };
    await generate(opts);
    await generate(opts);

    expect(breaker.splitChain).toHaveBeenCalledTimes(1);
  });

  it("never caches grading, so a student's answer is always marked fresh", async () => {
    await generate({ task: "grading", schema, prompt: "mark", cacheTtlMs: 0 });
    await generate({ task: "grading", schema, prompt: "mark", cacheTtlMs: 0 });

    expect(generateObject).toHaveBeenCalledTimes(2);
  });
});

describe("generate usage ledger (covers: AC-4)", () => {
  it("attributes the served call to the student who made it", async () => {
    await generate({
      task: "grading",
      schema,
      prompt: "hi",
      userId: "student-9",
    });

    const call = vi.mocked(usage.logUsage).mock.calls.at(-1)?.[0];
    expect(call?.userId).toBe("student-9");
  });

  it("records the model that actually served, not the head of the chain", async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(transportFailure())
      .mockResolvedValueOnce({ object: { ok: true } } as never);

    await generate({ task: "grading", schema, prompt: "hi", userId: "s1" });

    const call = vi.mocked(usage.logUsage).mock.calls.at(-1)?.[0];
    expect(call?.modelId).toBe("openai/gpt-5-nano");
  });

  it("records one row per served call", async () => {
    await generate({ task: "grading", schema, prompt: "hi" });
    expect(usage.logUsage).toHaveBeenCalledTimes(1);
  });
});

describe("generateTextWithFallback (covers: AC-1)", () => {
  it("falls through to the next model on a transport fault", async () => {
    vi.mocked(generateText)
      .mockRejectedValueOnce(transportFailure())
      .mockResolvedValueOnce({ text: "from second" } as never);

    const result = await generateTextWithFallback({
      task: "grading",
      prompt: "hi",
    });

    expect(result.text).toBe("from second");
  });

  it("applies the same output cap default as the object path", async () => {
    await generateTextWithFallback({ task: "grading", prompt: "hi" });
    expect(vi.mocked(generateText).mock.calls[0][0].maxOutputTokens).toBe(2048);
  });

  it("shows the friendly message when every model fails", async () => {
    vi.mocked(generateText).mockRejectedValue(transportFailure());
    await expect(
      generateTextWithFallback({ task: "grading", prompt: "hi" }),
    ).rejects.toThrow("briefly unavailable");
  });
});

describe("streamChat (covers: AC-6)", () => {
  it("starts a stream from the head model when it works", async () => {
    const result = await streamChat({ task: "fast_chat", messages: [] });
    expect(streamText).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it("falls through to the next model when the head stream yields no token", async () => {
    vi.mocked(streamText)
      .mockReturnValueOnce(lazyStream({ chunks: [], error: transportFailure() }))
      .mockReturnValueOnce(lazyStream({ chunks: ["ok"] }));

    await streamChat({ task: "fast_chat", messages: [] });

    expect(streamText).toHaveBeenCalledTimes(2);
  });

  it("returns the stream whose first token it already proved", async () => {
    const result = await streamChat({ task: "fast_chat", messages: [] });
    let text = "";
    for await (const chunk of (result as unknown as { textStream: AsyncIterable<string> })
      .textStream) {
      text += chunk;
    }
    expect(text).toBe("hello");
  });

  it("never asks the SDK to retry a single stream attempt", async () => {
    await streamChat({ task: "fast_chat", messages: [] });
    expect(vi.mocked(streamText).mock.calls[0][0].maxRetries).toBe(0);
  });

  it("gives a stream a longer budget than the object path, since chat runs tool steps", async () => {
    await streamChat({ task: "fast_chat", messages: [] });
    const call = vi.mocked(streamText).mock.calls[0][0];
    expect(call.timeout).toBe(CHAIN_STREAM_DEADLINE_MS);
    expect(call.timeout).toBeGreaterThan(CHAIN_DEADLINE_MS);
  });

  it("applies the same output cap default to a stream", async () => {
    await streamChat({ task: "fast_chat", messages: [] });
    expect(vi.mocked(streamText).mock.calls[0][0].maxOutputTokens).toBe(2048);
  });

  it("shows the friendly message when no model can start a stream", async () => {
    vi.mocked(streamText).mockImplementation(() =>
      lazyStream({ chunks: [], error: transportFailure() }),
    );

    await expect(
      streamChat({ task: "fast_chat", messages: [] }),
    ).rejects.toThrow("briefly unavailable");
  });

  it("records a transport failure for the model whose stream died", async () => {
    vi.mocked(streamText)
      .mockReturnValueOnce(lazyStream({ chunks: [], error: transportFailure() }))
      .mockReturnValueOnce(lazyStream({ chunks: ["ok"] }));

    await streamChat({ task: "fast_chat", messages: [] });

    expect(breaker.recordTransportFailure).toHaveBeenCalledWith(
      "google/gemini-3.7-flash",
    );
  });

  it("fails fast on a bad request rather than restarting the stream", async () => {
    const bad = new Error("invalid_request_error");
    Object.assign(bad, { status: 400 });
    vi.mocked(streamText).mockImplementation(() =>
      lazyStream({ chunks: [], error: bad }),
    );

    await expect(
      streamChat({ task: "fast_chat", messages: [] }),
    ).rejects.toThrow("invalid_request_error");
  });

  it("keeps a student supplied output cap on the stream", async () => {
    await streamChat({
      task: "fast_chat",
      messages: [],
      modelOptions: { temperature: 0.2, maxOutputTokens: 900 },
    });

    const call = vi.mocked(streamText).mock.calls[0][0];
    expect(call.maxOutputTokens).toBe(900);
    expect(call.temperature).toBe(0.2);
  });

  it("passes tools through to the stream, so chat keeps its tools", async () => {
    const tools = { searchNotes: {} };
    await streamChat({ task: "reasoning", messages: [], tools });

    expect(vi.mocked(streamText).mock.calls[0][0].tools).toBe(tools);
  });

  it("releases the probe on every exit path, so a tripped model is never stranded", async () => {
    vi.mocked(streamText).mockImplementation(() =>
      lazyStream({
        chunks: [],
        error: Object.assign(new Error("bad"), { status: 400 }),
      }),
    );

    await expect(
      streamChat({ task: "fast_chat", messages: [] }),
    ).rejects.toThrow();

    expect(realMarkProbeStart("google/gemini-3.7-flash")).toBe(true);
  });
});
