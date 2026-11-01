import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/subscription/manual/route";
import { auth } from "@/lib/auth";

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

const session = {
  user: { id: "u-1", email: "a@b.com", name: "Student" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(session as never);
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

describe("POST /api/subscription/manual (spec 0039 AC-5, retired)", () => {
  it("returns 401 when there is no session", async () => {
    const res = await post(
      { plan: "PRO", transactionId: "txn-1", paymentMethod: "MTN" },
      null,
    );

    expect(res.status).toBe(401);
  });

  it("returns 410 and never accepts a transaction id", async () => {
    const res = await post({
      plan: "PRO",
      transactionId: "txn-1",
      paymentMethod: "MTN",
    });

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/Fapshi/i);
  });

  it("returns 410 for any plan, including the retired monthly keys", async () => {
    const res = await post({
      plan: "STARTER",
      transactionId: "txn-2",
      paymentMethod: "ORANGE",
    });

    expect(res.status).toBe(410);
  });

  it("GET is retired too", async () => {
    const res = await GET();

    expect([401, 410]).toContain(res.status);
  });
});
