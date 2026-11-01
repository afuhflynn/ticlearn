import { describe, expect, it } from "vitest";

import {
  detectCutoff,
  isCutoffMessage,
  smallerRetryCount,
} from "@/lib/ai/validators";

describe("isCutoffMessage (spec 0040, covers: AC-2)", () => {
  it("reads a length stop as a cutoff", () => {
    expect(isCutoffMessage("Response stopped: finish reason length")).toBe(
      true,
    );
  });

  it("reads truncation wording as a cutoff", () => {
    expect(isCutoffMessage("Output was truncated at the limit")).toBe(true);
  });

  it("reads budget wording as a cutoff", () => {
    expect(isCutoffMessage("Too many tokens, max tokens reached")).toBe(true);
  });

  it("reads a plain failure as no cutoff", () => {
    expect(isCutoffMessage("Quiz generation failed. Try again.")).toBe(false);
  });

  it("reads empty text as no cutoff", () => {
    expect(isCutoffMessage("")).toBe(false);
  });
});

describe("smallerRetryCount (spec 0040, covers: AC-2)", () => {
  it("halves a large ask, rounded down", () => {
    expect(smallerRetryCount(10)).toBe(5);
    expect(smallerRetryCount(9)).toBe(4);
  });

  it("floors the retry at 3", () => {
    expect(smallerRetryCount(5)).toBe(3);
    expect(smallerRetryCount(4)).toBe(3);
  });

  it("skips the retry at 3 or less", () => {
    expect(smallerRetryCount(3)).toBeNull();
    expect(smallerRetryCount(2)).toBeNull();
    expect(smallerRetryCount(1)).toBeNull();
  });

  it("skips the retry when the ask is not a usable number", () => {
    expect(smallerRetryCount(Number.NaN)).toBeNull();
  });
});

describe("detectCutoff (spec 0040, covers: AC-2)", () => {
  it("flags a cutoff error message even when the counts look whole", () => {
    expect(
      detectCutoff({ asked: 5, got: 5, errorMessage: "length limit hit" }),
    ).toBe(true);
  });

  it("flags a length stop reason", () => {
    expect(detectCutoff({ asked: 5, got: 5, stopReason: "length" })).toBe(true);
  });

  it("flags a short set with no other signal", () => {
    expect(detectCutoff({ asked: 5, got: 3 })).toBe(true);
  });

  it("clears a whole set with no failure signal", () => {
    expect(detectCutoff({ asked: 5, got: 5 })).toBe(false);
  });
});
