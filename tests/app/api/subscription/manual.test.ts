import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/subscription/manual/route";
import { planCatalog } from "@/constants/plans";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

const subscriptionUpsert = vi.fn();

const db = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  subscription: {
    upsert: typeof subscriptionUpsert;
  };
};

const session = {
  user: { id: "u-1", email: "a@b.com", name: "Student" },
};

const user = {
  id: "u-1",
  email: "a@b.com",
  name: "Student",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(session as never);
  vi.mocked(db.user.findUnique).mockResolvedValue(user as never);
  // The setup mock does not include subscription.upsert, so install it here.
  db.subscription.upsert = subscriptionUpsert;
  vi.mocked(subscriptionUpsert).mockResolvedValue({
    id: "sub-1",
    plan: "PRO",
    status: "PENDING",
    amount: 2_500,
    fapshiTransId: "txn-1",
    createdAt: new Date(),
  } as never);
});

const post = (body: unknown, sessionOverride?: unknown) => {
  if (sessionOverride === undefined) {
    vi.mocked(auth.api.getSession).mockResolvedValue(session as never);
  } else {
    vi.mocked(auth.api.getSession).mockResolvedValue(sessionOverride as never);
  }
  return POST(
    new Request("http://localhost/api/subscription/manual", {
      method: "POST",
      body: JSON.stringify(body),
    }) as NextRequest,
  );
};

describe("POST /api/subscription/manual", () => {
  it("returns 401 when there is no session", async () => {
    const res = await post(
      { plan: "PRO", transactionId: "txn-1", paymentMethod: "MTN" },
      null,
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await post({ plan: "PRO" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid plan", async () => {
    const res = await post({
      plan: "FREE",
      transactionId: "txn-1",
      paymentMethod: "MTN",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid payment method", async () => {
    const res = await post({
      plan: "PRO",
      transactionId: "txn-1",
      paymentMethod: "CARD",
    });

    expect(res.status).toBe(400);
  });

  it("creates a pending subscription when none exists", async () => {
    const res = await post({
      plan: "PRO",
      transactionId: "txn-1",
      paymentMethod: "MTN",
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(subscriptionUpsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u-1" },
        create: expect.objectContaining({
          userId: "u-1",
          plan: "PRO",
          status: "PENDING",
          amount: planCatalog.PRO.priceXaf,
          fapshiTransId: "txn-1",
        }),
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.subscription.status).toBe("PENDING");
  });

  it("reuses the existing row when the student retries", async () => {
    vi.mocked(subscriptionUpsert).mockResolvedValue({
      id: "sub-1",
      plan: "STARTER",
      status: "PENDING",
      amount: 3_000,
      fapshiTransId: "txn-2",
      createdAt: new Date(),
    } as never);

    const res = await post({
      plan: "STARTER",
      transactionId: "txn-2",
      paymentMethod: "ORANGE",
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(subscriptionUpsert)).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          plan: "STARTER",
          amount: planCatalog.STARTER.priceXaf,
          fapshiTransId: "txn-2",
        }),
      }),
    );
  });
});
