import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";
import { limit } from "@/lib/rate-limit";
import { inngest } from "@/lib/inngest/client";

function submit(body: unknown) {
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
}

const valid = {
  name: "Student Person",
  email: "student@example.com",
  subject: "Question about billing",
  message: "Where can I download my receipt please?",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(limit).mockResolvedValue(null);
  vi.mocked(inngest.send).mockResolvedValue(undefined as never);
  process.env.ADMIN_EMAIL = "admin@ticlearn.test";
});

describe("POST /api/contact (covers: AC-4)", () => {
  it("returns the rate limit response when the limiter denies", async () => {
    vi.mocked(limit).mockResolvedValueOnce({
      status: 429,
      json: () => Promise.resolve({ error: "Too many requests" }),
    } as never);

    const res = await submit(valid);

    expect(res.status).toBe(429);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("quietly accepts a bot honeypot without queuing an email", async () => {
    const res = await submit({ ...valid, website: "http://spam.example" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("rejects a message that is too short with 400", async () => {
    const res = await submit({ ...valid, message: "too short" });

    expect(res.status).toBe(400);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("queues the contact email and returns success immediately", async () => {
    const res = await submit(valid);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "email.send.contact",
        data: expect.objectContaining({
          email: valid.email,
          subject: valid.subject,
          adminEmail: "admin@ticlearn.test",
        }),
      }),
    );
  });

  it("returns 500 when the admin inbox is not configured", async () => {
    delete process.env.ADMIN_EMAIL;

    const res = await submit(valid);

    expect(res.status).toBe(500);
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
