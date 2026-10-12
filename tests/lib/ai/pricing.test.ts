import { describe, expect, it } from "vitest";
import { DEFAULT_CHAIN } from "@/lib/ai/chain";
import {
  DEFAULT_USD_TO_XAF_RATE,
  estimateCostUsd,
  MODEL_PRICES,
  priceFor,
  usdToXaf,
} from "@/lib/ai/pricing";

describe("priceFor (covers: AC-4)", () => {
  it("returns the listed price for a known model", () => {
    expect(priceFor("openai/gpt-5-nano")).toEqual({
      inputPerMillion: 0.05,
      outputPerMillion: 0.4,
    });
  });

  it("falls back to a mid price for an unknown model instead of returning zero", () => {
    expect(priceFor("nobody/unknown")).toEqual({
      inputPerMillion: 0.5,
      outputPerMillion: 2.0,
    });
  });

  it("prices every shipped chain model so XAF never silently becomes zero", () => {
    for (const id of DEFAULT_CHAIN) {
      expect(MODEL_PRICES[id], `no price for ${id}`).toBeDefined();
    }
  });

  it("holds only positive prices, since a negative would corrupt XAF", () => {
    for (const [id, price] of Object.entries(MODEL_PRICES)) {
      expect(price.inputPerMillion, id).toBeGreaterThan(0);
      expect(price.outputPerMillion, id).toBeGreaterThan(0);
    }
  });
});

describe("estimateCostUsd", () => {
  it("charges input and output at their own rates", () => {
    const cost = estimateCostUsd("openai/gpt-5-nano", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.05 + 0.4, 10);
  });

  it("returns zero for a call that used no tokens", () => {
    expect(estimateCostUsd("openai/gpt-5-nano", 0, 0)).toBe(0);
  });

  it("scales linearly with token count", () => {
    const one = estimateCostUsd("openai/gpt-5-nano", 1000, 0);
    const two = estimateCostUsd("openai/gpt-5-nano", 2000, 0);
    expect(two).toBeCloseTo(one * 2, 10);
  });

  it("makes output dearer than input for the same token count", () => {
    const input = estimateCostUsd("google/gemini-3.7-flash", 10_000, 0);
    const output = estimateCostUsd("google/gemini-3.7-flash", 0, 10_000);
    expect(output).toBeGreaterThan(input);
  });

  it("keeps a realistic student call well under one cent", () => {
    const cost = estimateCostUsd("openai/gpt-5-nano", 4000, 1000);
    expect(cost).toBeLessThan(0.01);
  });
});

describe("usdToXaf (covers: AC-4)", () => {
  it("converts at the supplied rate", () => {
    expect(usdToXaf(2, 650)).toBe(1300);
  });

  it("rounds up to whole XAF, since money has no minor units here", () => {
    expect(usdToXaf(0.0001, 650)).toBe(1);
    expect(Number.isInteger(usdToXaf(0.0051, 650))).toBe(true);
  });

  it("returns zero for a zero cost", () => {
    expect(usdToXaf(0, 650)).toBe(0);
  });

  it("returns zero for a negative cost rather than crediting the student", () => {
    expect(usdToXaf(-5, 650)).toBe(0);
  });

  it("returns zero for a non finite cost", () => {
    expect(usdToXaf(Number.NaN, 650)).toBe(0);
  });

  it("falls back to the default rate when given a nonsense rate", () => {
    expect(usdToXaf(1, 0)).toBe(DEFAULT_USD_TO_XAF_RATE);
    expect(usdToXaf(1, -100)).toBe(DEFAULT_USD_TO_XAF_RATE);
    expect(usdToXaf(1, Number.NaN)).toBe(DEFAULT_USD_TO_XAF_RATE);
  });
});
