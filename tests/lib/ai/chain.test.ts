import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CHAIN_DEADLINE_MS,
  headFailArmed,
  isFailFastError,
  isSchemaError,
  isTransportError,
  OPEN_WEIGHT_CHAIN,
  perAttemptBudget,
  statusOf,
  withDeadline,
} from "@/lib/ai/chain";
import { MODEL_PRICES } from "@/lib/ai/pricing";
import {
  MODEL_ALLOWLIST,
  resolveChain,
  TEXT_CHAIN,
  taskRegistry,
} from "@/lib/ai/registry";

function apiError(message: string, extra: Record<string, unknown> = {}) {
  const err = new Error(message);
  Object.assign(err, extra);
  return err;
}

describe("resolveChain (covers: AC-5)", () => {
  const original = process.env.AI_CHAIN_ORDER;

  beforeEach(() => {
    delete process.env.AI_CHAIN_ORDER;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AI_CHAIN_ORDER;
    else process.env.AI_CHAIN_ORDER = original;
  });

  it("gives every task a chain of open weight models, so no bill can run up", () => {
    for (const [task, config] of Object.entries(taskRegistry)) {
      for (const id of config.chain) {
        expect(
          OPEN_WEIGHT_CHAIN.includes(id),
          `${task} names ${id}, which is not open weight`,
        ).toBe(true);
      }
    }
  });

  it("holds enough models per task that one lab going down cannot empty it", () => {
    for (const config of Object.values(taskRegistry)) {
      expect(config.chain.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("spans more than one lab so correlated faults do not empty the chain", () => {
    const labs = new Set(OPEN_WEIGHT_CHAIN.map((id) => id.split("/")[0]));
    expect(labs.size).toBeGreaterThan(1);
  });

  it("has a priced entry for every chain id so XAF math never guesses", () => {
    for (const id of OPEN_WEIGHT_CHAIN) {
      expect(MODEL_PRICES[id], `missing price for ${id}`).toBeDefined();
    }
  });

  it("has no duplicate ids so no model is tried twice per request", () => {
    expect(new Set(OPEN_WEIGHT_CHAIN).size).toBe(OPEN_WEIGHT_CHAIN.length);
    for (const config of Object.values(taskRegistry)) {
      expect(new Set(config.chain).size).toBe(config.chain.length);
    }
  });

  it("heads the chat task with the cheapest model it has", () => {
    const chat = taskRegistry.fast_chat.chain;
    const cheapest = [...OPEN_WEIGHT_CHAIN].sort(
      (a, b) =>
        MODEL_PRICES[a].inputPerMillion - MODEL_PRICES[b].inputPerMillion,
    );
    expect(chat[0]).toBe(cheapest[0]);
  });

  it("uses the override order when AI_CHAIN_ORDER is set", () => {
    // The ids have to be free ones, because the paid gate drops anything
    // priced above zero, and anything it does not know the price of.
    process.env.AI_CHAIN_ORDER =
      "z-ai/glm-4.7-flash, deepseek/deepseek-v4.1-flash ,openai/gpt-oss-120b";
    expect(resolveChain("fast_chat")).toEqual([
      "z-ai/glm-4.7-flash",
      "deepseek/deepseek-v4.1-flash",
      "openai/gpt-oss-120b",
    ]);
  });

  it("ignores blank entries in the override rather than calling an empty id", () => {
    process.env.AI_CHAIN_ORDER =
      "z-ai/glm-4.7-flash, , ,deepseek/deepseek-v4.1-flash";
    expect(resolveChain("fast_chat")).toEqual([
      "z-ai/glm-4.7-flash",
      "deepseek/deepseek-v4.1-flash",
    ]);
  });

  it("drops a paid model from the override unless the paid gate is open", () => {
    process.env.AI_CHAIN_ORDER =
      "anthropic/claude-haiku-5.5, z-ai/glm-4.7-flash";
    expect(resolveChain("fast_chat")).toEqual(["z-ai/glm-4.7-flash"]);
  });

  it("falls back to the text chain when the override is only commas", () => {
    process.env.AI_CHAIN_ORDER = " , , ";
    expect(resolveChain("fast_chat")).toEqual(TEXT_CHAIN);
  });

  it("falls back to the task chain for a multimodal task when the override is only commas", () => {
    process.env.AI_CHAIN_ORDER = " , , ";
    expect(resolveChain("fast_chat", { multimodal: true })).toEqual(
      taskRegistry.fast_chat.chain,
    );
  });

  it("returns a copy so a caller cannot mutate the registry", () => {
    const first = resolveChain("fast_chat");
    const untouched = [...first];
    first.push("injected/model");
    expect(resolveChain("fast_chat")).toEqual(untouched);
  });

  it("lists every task chain model on the allow list a prompt header is checked against", () => {
    for (const config of Object.values(taskRegistry)) {
      for (const id of config.chain) {
        expect(MODEL_ALLOWLIST).toContain(id);
      }
    }
  });
});

describe("headFailArmed", () => {
  const original = process.env.AI_HEAD_FAIL_ONCE;

  afterEach(() => {
    if (original === undefined) delete process.env.AI_HEAD_FAIL_ONCE;
    else process.env.AI_HEAD_FAIL_ONCE = original;
  });

  it("is off by default so production never forces a failure", () => {
    delete process.env.AI_HEAD_FAIL_ONCE;
    expect(headFailArmed()).toBe(false);
  });

  it("is armed only when the flag is exactly 1", () => {
    process.env.AI_HEAD_FAIL_ONCE = "1";
    expect(headFailArmed()).toBe(true);
  });

  it("stays off for any other truthy looking value", () => {
    process.env.AI_HEAD_FAIL_ONCE = "true";
    expect(headFailArmed()).toBe(false);
  });
});

describe("statusOf", () => {
  it("reads status from a status field", () => {
    expect(statusOf({ status: 503 })).toBe(503);
  });

  it("falls back to statusCode when status is absent", () => {
    expect(statusOf({ statusCode: 429 })).toBe(429);
  });

  it("returns null when the error carries no numeric status", () => {
    expect(statusOf(new Error("boom"))).toBeNull();
  });

  it("returns null when status is present but not a number", () => {
    expect(statusOf({ status: "503" })).toBeNull();
  });
});

describe("error classification (covers: AC-3)", () => {
  it("treats a Zod validation failure as a schema error", () => {
    expect(isSchemaError(new Error("ZodError: invalid_type"))).toBe(true);
  });

  it("treats a no object generated failure as a schema error", () => {
    expect(
      isSchemaError(
        new Error("NoObjectGeneratedError: response did not match schema"),
      ),
    ).toBe(true);
  });

  it("never treats a schema failure as a transport fault, so the breaker stays shut", () => {
    const err = new Error("ZodError: expected boolean");
    expect(isTransportError(err)).toBe(false);
  });

  it("fails fast on a schema failure instead of falling through the chain", () => {
    expect(isFailFastError(new Error("NoObjectGeneratedError"))).toBe(true);
  });

  it("treats a timeout as a transport fault so the breaker can trip", () => {
    const err = apiError("This operation was aborted", { name: "AbortError" });
    expect(isTransportError(err)).toBe(true);
  });

  it("treats a 429 as a transport fault so rate limiting does not park a good model", () => {
    expect(isTransportError(apiError("rate limited", { status: 429 }))).toBe(
      true,
    );
  });

  it("never fails fast on a 429, since it should fall through to the next model", () => {
    expect(isFailFastError(apiError("rate limited", { status: 429 }))).toBe(
      false,
    );
  });

  it("treats a 500 as a transport fault", () => {
    expect(isTransportError(apiError("server exploded", { status: 500 }))).toBe(
      true,
    );
  });

  it("treats a 502 as a transport fault", () => {
    expect(isTransportError(apiError("bad gateway", { status: 502 }))).toBe(
      true,
    );
  });

  it("fails fast on a 400, because a bad request will fail on every model", () => {
    const err = apiError("bad prompt", { status: 400 });
    expect(isFailFastError(err)).toBe(true);
    expect(isTransportError(err)).toBe(false);
  });

  it("fails fast on a 401 and never trips the breaker for a key problem", () => {
    const err = apiError("unauthorized", { status: 401 });
    expect(isFailFastError(err)).toBe(true);
    expect(isTransportError(err)).toBe(false);
  });

  it("fails fast on a 402 so a credit shortfall does not walk the whole chain", () => {
    expect(isFailFastError(apiError("out of credits", { status: 402 }))).toBe(
      true,
    );
  });

  it("treats a plain socket hangup as a transport fault", () => {
    expect(isTransportError(new Error("socket hang up"))).toBe(true);
  });

  it("does not classify an unrelated error as either kind", () => {
    const err = new Error("something entirely different");
    expect(isTransportError(err)).toBe(false);
    expect(isFailFastError(err)).toBe(false);
  });
});

describe("perAttemptBudget", () => {
  it("gives every attempt a real slice of time instead of an even split", () => {
    expect(perAttemptBudget(CHAIN_DEADLINE_MS, 12)).toBe(6000);
  });

  it("never drops below two seconds, so a slow model is not cut off instantly", () => {
    expect(perAttemptBudget(3000, 12)).toBe(3000);
    expect(perAttemptBudget(100, 12)).toBe(2000);
  });

  it("never exceeds the six second per attempt cap, even with a huge total", () => {
    expect(perAttemptBudget(120_000, 2)).toBe(6000);
  });

  it("falls back to the shared deadline when given a nonsense total", () => {
    expect(perAttemptBudget(Number.NaN, 1)).toBe(6000);
    expect(perAttemptBudget(0, 1)).toBe(6000);
    expect(perAttemptBudget(-5, 1)).toBe(6000);
  });

  it("uses the whole shared deadline when the total is under the cap", () => {
    expect(perAttemptBudget(4000, 1)).toBe(4000);
  });

  it("ignores the remaining count, which an even split would have divided by", () => {
    expect(perAttemptBudget(CHAIN_DEADLINE_MS, 1)).toBe(
      perAttemptBudget(CHAIN_DEADLINE_MS, 12),
    );
  });
});

describe("withDeadline (covers: AC-1)", () => {
  it("returns the value when the work finishes in time", async () => {
    await expect(withDeadline(1000, async () => "done")).resolves.toBe("done");
  });

  it("aborts the signal when the work overruns the budget", async () => {
    let seen: AbortSignal | undefined;
    const work = new Promise<string>((resolve) => {
      withDeadline(20, (signal) => {
        seen = signal;
        setTimeout(() => resolve("late"), 40);
        return new Promise<string>((r) => setTimeout(r, 40));
      }).then(resolve, () => resolve("aborted"));
    });
    await work;
    expect(seen).toBeDefined();
    expect(seen?.aborted).toBe(true);
  });

  it("propagates a rejection from the work unchanged", async () => {
    await expect(
      withDeadline(1000, async () => {
        throw new Error("inner failure");
      }),
    ).rejects.toThrow("inner failure");
  });
});
