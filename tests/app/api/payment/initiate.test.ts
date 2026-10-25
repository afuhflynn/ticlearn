import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/payment/initiate/route";
import { auth } from "@/lib/auth";
import { initiatePayment } from "@/lib/fapshi";
import { prisma } from "@/lib/prisma";

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

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

const db = prisma as unknown as {
  subscription: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const session = {
  user: { id: "u-1", email: "a@b.com", name: "Student" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(session as never);
  vi.mocked(initiatePayment).mockResolvedValue({
    success: true,
    link: "https://pay.test/abc",
    transId: "t-1",
  });
  vi.mocked(db.subscription.findFirst).mockResolvedValue(null);
  vi.mocked(db.subscription.update).mockResolvedValue({} as never);
  vi.mocked(db.subscription.create).mockResolvedValue({ id: "sub-1" } as never);
});

const post = (body: unknown, sessionOverride?: unknown) => {
  if (sessionOverride === undefined) {
    vi.mocked(auth.api.getSession).mockResolvedValue(session as never);
  } else {
    vi.mocked(auth.api.getSession).mockResolvedValue(sessionOverride as never);
  }
  return POST(
    new Request("http://localhost/api/payment/initiate", {
      method: "POST",
      body: JSON.stringify(body),
    }) as NextRequest,
  );
};

describe("POST /api/payment/initiate (spec 0019 AC-6, AC-7)", () => {
  it("returns 401 when there is no session", async () => {
    const res = await post({ plan: "PRO" }, null);

    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid plan", async () => {
    const res = await post({ plan: "FREE" });

    expect(res.status).toBe(400);
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("creates a subscription and returns the payment link (happy path)", async () => {
    const res = await post({ plan: "PRO" });

    expect(res.status).toBe(200);
    expect(db.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u-1",
          plan: "PRO",
          status: "PENDING",
          amount: 2_500,
        }),
      }),
    );
    expect(initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2_500,
        email: "a@b.com",
        userId: "u-1",
      }),
    );
    const body = await res.json();
    expect(body.link).toBe("https://pay.test/abc");
  });

  it("reuses an existing subscription row for a re-attempt", async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValue({
      id: "sub-old",
      userId: "u-1",
    } as never);

    const res = await post({ plan: "PRO" });

    expect(res.status).toBe(200);
    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-old" },
        data: expect.objectContaining({
          plan: "PRO",
          status: "PENDING",
          amount: 2_500,
        }),
      }),
    );
    expect(db.subscription.create).not.toHaveBeenCalled();
  });

  it("returns 400 when the gateway returns no link", async () => {
    vi.mocked(initiatePayment).mockResolvedValue({
      success: false,
      message: "gateway down",
    });

    const res = await post({ plan: "PRO" });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("gateway down");
  });
});
