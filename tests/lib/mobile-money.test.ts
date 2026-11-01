import { describe, expect, it } from "vitest";
import {
  CREDIT_MAX_XAF,
  CREDIT_MIN_XAF,
  CREDIT_STEP_XAF,
  MOMO_PROVIDERS,
  creditsForXaf,
  normalizePhone,
  normalizeProvider,
} from "@/lib/mobile-money";

describe("mobile money rules (spec 0034)", () => {
  it("lists MTN first then Orange as a static pair", () => {
    expect(MOMO_PROVIDERS.map((p) => p.code)).toEqual(["MTN", "ORANGE"]);
  });

  it("fixes the typed credit bounds and rate", () => {
    expect(CREDIT_MIN_XAF).toBe(500);
    expect(CREDIT_MAX_XAF).toBe(20_000);
    expect(CREDIT_STEP_XAF).toBe(100);
    expect(creditsForXaf(500)).toBe(2_500);
    expect(creditsForXaf(3000)).toBe(15_000);
  });

  it("accepts only MTN or Orange providers", () => {
    expect(normalizeProvider("mtn")).toBe("MTN");
    expect(normalizeProvider("Orange")).toBe("ORANGE");
    expect(normalizeProvider("YOOME")).toBeNull();
    expect(normalizeProvider("")).toBeNull();
  });

  it("normalizes Cameroon phones to 9 digits", () => {
    expect(normalizePhone("677123456")).toBe("677123456");
    expect(normalizePhone("237677123456")).toBe("677123456");
    expect(normalizePhone("+237 677 12 34 56")).toBe("677123456");
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("777123456")).toBeNull();
  });
});
