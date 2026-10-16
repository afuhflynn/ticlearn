import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/email-provider/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailSuppression: { upsert: vi.fn() },
  },
}));

const db = prisma as unknown as {
  emailSuppression: { upsert: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  db.emailSuppression.upsert.mockResolvedValue({} as never);
  process.env.EMAIL_WEBHOOK_SECRET = "testsecret";
});

describe("POST /api/webhooks/email-provider", () => {
  it("returns 503 when no secret is configured", async () => {
    delete process.env.EMAIL_WEBHOOK_SECRET;
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-provider", {
        method: "POST",
        body: JSON.stringify({ type: "bounced", email: "a@b.com" }),
        headers: { "content-type": "application/json" },
      }) as NextRequest,
    );
    expect(res.status).toBe(503);
  });

  it("returns 401 with an invalid bearer token", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-provider", {
        method: "POST",
        body: JSON.stringify({ type: "bounced", email: "a@b.com" }),
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer wrong",
        },
      }) as NextRequest,
    );
    expect(res.status).toBe(401);
    expect(db.emailSuppression.upsert).not.toHaveBeenCalled();
  });

  it("upserts a suppression row on a bounced event", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-provider", {
        method: "POST",
        body: JSON.stringify({ type: "bounced", email: "blocked@example.com" }),
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer testsecret",
        },
      }) as NextRequest,
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      processed: 1,
    });
    expect(db.emailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "blocked@example.com" },
        create: expect.objectContaining({ reason: "BOUNCED" }),
      }),
    );
  });

  it("ignores unknown event types", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-provider", {
        method: "POST",
        body: JSON.stringify({ type: "delivered", email: "ok@example.com" }),
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer testsecret",
        },
      }) as NextRequest,
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ processed: 0 });
    expect(db.emailSuppression.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/webhooks/email-provider", {
        method: "POST",
        body: "{not json",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer testsecret",
        },
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
  });
});
