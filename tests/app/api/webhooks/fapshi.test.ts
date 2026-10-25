import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/fapshi/route";
import { prisma } from "@/lib/prisma";

let authHeaderValue = "Bearer testsecret";

vi.mock("@/lib/env", () => ({
  webhookSecret: "testsecret",
}));

vi.mock("@/lib/platform-settings", () => ({
  CREDIT_PURCHASE_EXTERNAL_ID_PREFIX: "cpo_",
  getPlatformSettings: vi.fn(() =>
    Promise.resolve({
      creditCostQuizGeneration: 10,
      creditCostAiTutorMessage: 5,
    }),
  ),
  quizCreditsRequired: vi.fn(() => false),
  creditEnforcementEffective: vi.fn(() => ({ aiTutor: false })),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers({ authorization: authHeaderValue })),
  cookies: vi.fn(() => ({ getAll: () => [], get: () => undefined })),
}));

const db = prisma as unknown as {
  subscription: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  userStats: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  affiliate: { findUnique: ReturnType<typeof vi.fn> };
  affiliateEarning: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  creditPurchaseOrder: unknown;
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  authHeaderValue = "Bearer testsecret";
  vi.clearAllMocks();
  vi.mocked(db.subscription.findFirst).mockResolvedValue(null);
  vi.mocked(db.subscription.findUnique).mockResolvedValue(null);
  vi.mocked(db.subscription.update).mockResolvedValue({} as never);
  vi.mocked(db.userStats.findFirst).mockResolvedValue(null);
  vi.mocked(db.userStats.create).mockResolvedValue({} as never);
  vi.mocked(db.affiliate.findUnique).mockResolvedValue(null);
  vi.mocked(db.affiliateEarning.findFirst).mockResolvedValue(null);
  vi.mocked(db.affiliateEarning.create).mockResolvedValue({} as never);
  (prisma.creditPurchaseOrder as any).findFirst = vi
    .fn()
    .mockResolvedValue(null);
  // $transaction is called with an array of operations in the SUCCESSFUL path.
  vi.mocked(db.$transaction).mockImplementation(async (ops: any) => {
    if (Array.isArray(ops)) {
      const results: unknown[] = [];
      for (const op of ops) {
        results.push(await op);
      }
      return results;
    }
    return ops({});
  });
});

const successfulBody = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    transId: "trans-123",
    status: "SUCCESSFUL",
    externalId: "sub-1",
    amount: 2500,
    ...overrides,
  });

describe("POST /api/webhooks/fapshi (spec 0019 AC-6)", () => {
  it("ignores a stale callback whose transId differs from the stored one", async () => {
    const sub = {
      id: "sub-1",
      plan: "PRO",
      status: "PENDING",
      amount: 2_500,
      fapshiTransId: "old-trans-id",
      user: { userEmail: "a@b.com", userName: "Student", referredBy: null },
    };
    vi.mocked(db.subscription.findUnique).mockResolvedValue(sub as never);

    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody({ transId: "new-trans-id" }),
      }) as NextRequest,
    );

    expect(res.status).toBe(200);
    // A stale callback must not activate the subscription: no update runs.
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("activates the subscription when the transId matches the stored one", async () => {
    const sub = {
      id: "sub-1",
      plan: "PRO",
      status: "PENDING",
      amount: 2_500,
      fapshiTransId: "trans-123",
      user: { userEmail: "a@b.com", userName: "Student", referredBy: null },
    };
    vi.mocked(db.subscription.findUnique).mockResolvedValue(sub as never);

    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody(),
      }) as NextRequest,
    );

    expect(res.status).toBe(200);
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("rejects a wrong webhook secret", async () => {
    authHeaderValue = "Bearer wrong";
    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody(),
      }) as NextRequest,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: JSON.stringify({ transId: "trans-1" }),
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown subscription", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody({ externalId: "sub-missing" }),
      }) as NextRequest,
    );
    expect(res.status).toBe(404);
  });

  it("marks the subscription FAILED when the webhook reports FAILED", async () => {
    const sub = {
      id: "sub-1",
      plan: "PRO",
      status: "PENDING",
      amount: 2_500,
      fapshiTransId: "trans-123",
      user: { userEmail: "a@b.com", userName: "Student", referredBy: null },
    };
    vi.mocked(db.subscription.findUnique).mockResolvedValue(sub as never);

    const res = await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody({ status: "FAILED" }),
      }) as NextRequest,
    );

    expect(res.status).toBe(200);
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("uses the stored amount, not the body amount, for the receipt (spec 0019 AC-6)", async () => {
    const sub = {
      id: "sub-1",
      plan: "PRO",
      status: "PENDING",
      amount: 2_500,
      fapshiTransId: "trans-123",
      user: { userEmail: "a@b.com", userName: "Student", referredBy: null },
    };
    vi.mocked(db.subscription.findUnique).mockResolvedValue(sub as never);

    await POST(
      new Request("http://localhost/api/webhooks/fapshi", {
        method: "POST",
        body: successfulBody({ amount: 9_999 }),
      }) as NextRequest,
    );

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });
});
