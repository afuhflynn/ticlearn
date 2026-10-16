import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/unsubscribe/[token]/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userSettings: { upsert: vi.fn() },
    emailSuppression: { upsert: vi.fn() },
  },
}));

const db = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  userSettings: { upsert: ReturnType<typeof vi.fn> };
  emailSuppression: { upsert: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "u1", email: "u@x.com" } as never);
  db.userSettings.upsert.mockResolvedValue({} as never);
  db.emailSuppression.upsert.mockResolvedValue({} as never);
});

describe("GET /api/unsubscribe/[token]", () => {
  it("returns 404 for an invalid token", async () => {
    const res = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ token: "!!!" }),
    });
    // token decodes to garbage; findUnique returns null in this mock only if we set it
    db.user.findUnique.mockResolvedValueOnce(null as never);
    const r = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ token: Buffer.from("nope").toString("base64url") }),
    });
    expect(r.status).toBe(404);
  });

  it("opts the user out and suppresses on valid token", async () => {
    const token = Buffer.from("u1").toString("base64url");
    const res = await GET(new Request("http://localhost") as NextRequest, {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(200);
    expect(db.userSettings.upsert).toHaveBeenCalled();
    expect(db.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ reason: "UNSUBSCRIBED" }),
      }),
    );
  });
});
