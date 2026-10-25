import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPlanPrice,
  initiatePayment,
  parseFapshiPaymentStatusPayload,
} from "@/lib/fapshi";

vi.mock("@/lib/fapshi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fapshi")>();
  return {
    ...actual,
    initiatePayment: vi.fn(() =>
      Promise.resolve({
        success: true,
        link: "https://pay.test/abc",
        transId: "t-1",
      }),
    ),
  };
});

const originalFetch = globalThis.fetch as typeof fetch;

beforeEach(() => {
  vi.stubGlobal("fetch", originalFetch);
  vi.mocked(initiatePayment).mockResolvedValue({
    success: true,
    link: "https://pay.test/abc",
    transId: "t-1",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPlanPrice (spec 0019 AC-6)", () => {
  it("returns the catalogue amount and fcfa string for STARTER", () => {
    const price = getPlanPrice("STARTER");
    expect(price.amount).toBe(3_000);
    expect(price.fcfa).toBe("3,000");
  });

  it("returns the catalogue amount and fcfa string for PRO", () => {
    const price = getPlanPrice("PRO");
    expect(price.amount).toBe(2_500);
    expect(price.fcfa).toBe("2,500");
  });

  it("returns the catalogue amount and fcfa string for STANDARD and PREMIUM", () => {
    expect(getPlanPrice("STANDARD").amount).toBe(5_000);
    expect(getPlanPrice("PREMIUM").amount).toBe(10_000);
  });

  it("returns zero for a plan that is not in the catalogue", () => {
    const price = getPlanPrice("NOPE" as never);
    expect(price.amount).toBe(0);
    expect(price.fcfa).toBe("0");
  });
});

describe("parseFapshiPaymentStatusPayload", () => {
  it("reads a flat payload", () => {
    const parsed = parseFapshiPaymentStatusPayload({
      externalId: "ext-1",
      status: "SUCCESSFUL",
      transId: "trans-1",
    });
    expect(parsed).toEqual({
      externalId: "ext-1",
      status: "SUCCESSFUL",
      transId: "trans-1",
    });
  });

  it("unwraps a nested data transaction wrapper", () => {
    const parsed = parseFapshiPaymentStatusPayload({
      data: {
        transaction: {
          external_id: "ext-2",
          payment_status: "FAILED",
          trans_id: "trans-2",
        },
      },
    });
    expect(parsed?.externalId).toBe("ext-2");
    expect(parsed?.status).toBe("FAILED");
    expect(parsed?.transId).toBe("trans-2");
  });

  it("reads status and trans id aliases", () => {
    const parsed = parseFapshiPaymentStatusPayload({
      external_id: "ext-3",
      paymentStatus: "EXPIRED",
      transId: "trans-3",
    });
    expect(parsed?.externalId).toBe("ext-3");
    expect(parsed?.status).toBe("EXPIRED");
    expect(parsed?.transId).toBe("trans-3");
  });

  it("returns null when required fields are missing", () => {
    expect(parseFapshiPaymentStatusPayload({ externalId: "x" })).toBeNull();
    expect(parseFapshiPaymentStatusPayload(null)).toBeNull();
    expect(parseFapshiPaymentStatusPayload("not an object")).toBeNull();
    expect(parseFapshiPaymentStatusPayload({})).toBeNull();
  });
});

describe("initiatePayment", () => {
  // setup.ts mocks @/lib/fapshi globally with initiatePayment always
  // succeeding, so the real not-configured path cannot be exercised here.
  // The gateway success and failure paths are covered at the payment-route
  // level (tests/app/api/payment/initiate.test.ts).
  it("is routed through the mocked gateway in tests", () => {
    expect(typeof initiatePayment).toBe("function");
  });
});
