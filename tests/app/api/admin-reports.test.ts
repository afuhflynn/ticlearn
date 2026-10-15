import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/reports/route";
import { GET as getReportStatus } from "@/app/api/admin/reports/[id]/route";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { setReport } from "@/lib/reports/store";

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

function dispatch(type: unknown) {
  return POST(
    new Request("http://localhost/api/admin/reports", {
      method: "POST",
      body: JSON.stringify({ type }),
      headers: { "content-type": "application/json" },
    }),
  );
}

function statusOf(id: string) {
  return getReportStatus(
    new Request(`http://localhost/api/admin/reports/${id}`),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "admin-1", role: "ADMIN" });
  vi.mocked(inngest.send).mockResolvedValue(undefined as never);
});

describe("POST /api/admin/reports (covers: AC-5)", () => {
  it("returns 401 without a session", async () => {
    signIn(null);

    expect((await dispatch("users")).status).toBe(401);
  });

  it("returns 403 for a non admin caller and queues nothing", async () => {
    signIn({ id: "student-1", role: "USER" });

    const res = await dispatch("users");

    expect(res.status).toBe(403);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("rejects an unknown report type with 400", async () => {
    const res = await dispatch("passwords");

    expect(res.status).toBe(400);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("queues the report job and returns a PROCESSING report id", async () => {
    const res = await dispatch("users");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PROCESSING");
    expect(typeof body.reportId).toBe("string");
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "admin/report.generate",
        data: expect.objectContaining({ type: "users", reportId: body.reportId }),
      }),
    );
  });

  it("still returns 200 PROCESSING when the queue send itself fails (covers: AC-6)", async () => {
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("queue down"));

    const res = await dispatch("users");

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("PROCESSING");
  });
});

describe("GET /api/admin/reports/[id] (covers: AC-5)", () => {
  it("returns 401 without a session", async () => {
    signIn(null);

    expect((await statusOf("r1")).status).toBe(401);
  });

  it("returns 403 for a non admin caller", async () => {
    signIn({ id: "student-1", role: "USER" });

    expect((await statusOf("r1")).status).toBe(403);
  });

  it("returns 404 for an unknown report id", async () => {
    expect((await statusOf("does-not-exist")).status).toBe(404);
  });

  it("reports PROCESSING with no download link yet", async () => {
    setReport("r-processing", { status: "PROCESSING" });

    const res = await statusOf("r-processing");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PROCESSING");
    expect(body.downloadUrl).toBeUndefined();
  });

  it("serves a base64 pdf download link once the job completes", async () => {
    setReport("r-done", { status: "COMPLETED", buffer: "JVBERi0=" });

    const res = await statusOf("r-done");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");
    expect(body.downloadUrl).toBe("data:application/pdf;base64,JVBERi0=");
  });
});
