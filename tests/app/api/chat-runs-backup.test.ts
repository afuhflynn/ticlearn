import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/chat/runs/backup/route";

/**
 * The light server mirror of the browser quiz snapshot (spec 0044, AC-5).
 *
 * Owner only: no session gives 401, a foreign conversation or a foreign run
 * id reads as missing with a 404 and no data. Writes pace on the client and
 * last write wins per run id.
 */

const getSessionMock = vi.hoisted(() => vi.fn());
const conversationFindFirst = vi.hoisted(() => vi.fn());
const backupFindUnique = vi.hoisted(() => vi.fn());
const backupFindFirst = vi.hoisted(() => vi.fn());
const backupUpsert = vi.hoisted(() => vi.fn());
const backupDeleteMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: { findFirst: conversationFindFirst },
    chatRunBackup: {
      findUnique: backupFindUnique,
      findFirst: backupFindFirst,
      upsert: backupUpsert,
      deleteMany: backupDeleteMany,
    },
  },
}));

const userId = "student-1";

function signIn() {
  getSessionMock.mockResolvedValue({ user: { id: userId } });
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/chat/runs/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
  );
}

function get(url: string) {
  return GET(new Request(url) as unknown as NextRequest);
}

function del(url: string) {
  return DELETE(
    new Request(url, { method: "DELETE" }) as unknown as NextRequest,
  );
}

const snapshot = {
  version: 6,
  quizId: "quiz-1",
  answers: { q1: "Paris" },
  marks: {},
  currentIndex: 1,
  count: 5,
  clientRunId: "run-1",
  updatedAt: Date.now(),
  items: [{ kind: "quiz", ref: "q1" }],
};

beforeEach(() => {
  getSessionMock.mockReset();
  conversationFindFirst.mockReset();
  backupFindUnique.mockReset();
  backupFindFirst.mockReset();
  backupUpsert.mockReset();
  backupDeleteMany.mockReset();
  getSessionMock.mockResolvedValue(null);
  conversationFindFirst.mockResolvedValue({ id: "conv-1" });
  backupFindUnique.mockResolvedValue(null);
  backupDeleteMany.mockResolvedValue({ count: 0 });
});

describe("POST /api/chat/runs/backup (covers: AC-5)", () => {
  it("returns 401 when there is no session", async () => {
    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 for a missing snapshot", async () => {
    signIn();

    const res = await post({ conversationId: "conv-1", clientRunId: "run-1" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for a foreign conversation with no data", async () => {
    signIn();
    conversationFindFirst.mockResolvedValue(null);

    const res = await post({
      conversationId: "conv-foreign",
      clientRunId: "run-1",
      snapshot,
    });

    expect(res.status).toBe(404);
    expect(backupUpsert).not.toHaveBeenCalled();
  });

  it("returns 404 when the run id belongs to someone else", async () => {
    signIn();
    backupFindUnique.mockResolvedValue({
      userId: "someone-else",
      conversationId: "conv-1",
    });

    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });

    expect(res.status).toBe(404);
    expect(backupUpsert).not.toHaveBeenCalled();
  });

  it("refuses a snapshot over the size cap", async () => {
    signIn();

    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot: { big: "x".repeat(250 * 1024) },
    });

    expect(res.status).toBe(400);
    expect(backupUpsert).not.toHaveBeenCalled();
  });

  it("upserts and returns ok plus the write time", async () => {
    signIn();
    const updatedAt = new Date();
    backupUpsert.mockResolvedValue({ updatedAt });

    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(backupUpsert).toHaveBeenCalledWith({
      where: { clientRunId: "run-1" },
      update: expect.objectContaining({ snapshot: expect.any(String) }),
      create: expect.objectContaining({
        userId,
        conversationId: "conv-1",
        clientRunId: "run-1",
      }),
      select: { updatedAt: true },
    });
  });

  it("returns 400 for a body that is not JSON", async () => {
    signIn();

    const res = await POST(
      new Request("http://localhost:3000/api/chat/runs/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json at all {{{",
      }) as unknown as NextRequest,
    );

    expect(res.status).toBe(400);
    expect(backupUpsert).not.toHaveBeenCalled();
  });

  it("stores a string snapshot as the raw copy", async () => {
    signIn();
    backupUpsert.mockResolvedValue({ updatedAt: new Date() });
    const raw = JSON.stringify(snapshot);

    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot: raw,
    });

    expect(res.status).toBe(200);
    expect(backupUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { snapshot: raw },
      }),
    );
  });

  it("sweeps the student stale rows on every write", async () => {
    signIn();
    backupUpsert.mockResolvedValue({ updatedAt: new Date() });

    const res = await post({
      conversationId: "conv-1",
      clientRunId: "run-1",
      snapshot,
    });

    expect(res.status).toBe(200);
    expect(backupDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });
});

describe("GET /api/chat/runs/backup (covers: AC-5)", () => {
  it("returns 401 when there is no session", async () => {
    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1",
    );

    expect(res.status).toBe(401);
  });

  it("returns 404 for a foreign conversation with no data", async () => {
    signIn();
    conversationFindFirst.mockResolvedValue(null);

    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-x&clientRunId=run-1",
    );

    expect(res.status).toBe(404);
  });

  it("reads one run copy by run id", async () => {
    signIn();
    const raw = JSON.stringify(snapshot);
    backupFindFirst.mockResolvedValue({
      snapshot: raw,
      updatedAt: new Date(),
    });

    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1&clientRunId=run-1",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshot).toBe(raw);
    expect(backupFindFirst).toHaveBeenCalledWith({
      where: { clientRunId: "run-1", userId, conversationId: "conv-1" },
      select: { snapshot: true, updatedAt: true },
    });
  });

  it("returns the latest copy when no run id is given", async () => {
    signIn();
    const raw = JSON.stringify(snapshot);
    backupFindFirst.mockResolvedValue({
      snapshot: raw,
      clientRunId: "run-1",
    });

    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshot).toBe(raw);
    expect(data.clientRunId).toBe("run-1");
  });

  it("reads an expired copy as missing and clears it", async () => {
    signIn();
    backupFindFirst.mockResolvedValue({
      snapshot: JSON.stringify(snapshot),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    });

    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1&clientRunId=run-1",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshot).toBeNull();
    expect(backupDeleteMany).toHaveBeenCalled();
  });

  it("reads only fresh rows for the latest copy", async () => {
    signIn();
    backupFindFirst.mockResolvedValue(null);

    const res = await get(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshot).toBeNull();
    expect(backupFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          conversationId: "conv-1",
          updatedAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });
});

describe("DELETE /api/chat/runs/backup (covers: AC-5)", () => {
  it("returns 401 when there is no session", async () => {
    const res = await del(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1",
    );

    expect(res.status).toBe(401);
  });

  it("clears one run copy scoped to the owner", async () => {
    signIn();

    const res = await del(
      "http://localhost:3000/api/chat/runs/backup?conversationId=conv-1&clientRunId=run-1",
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(backupDeleteMany).toHaveBeenCalledWith({
      where: { userId, conversationId: "conv-1", clientRunId: "run-1" },
    });
  });

  it("returns 400 when the conversation id is missing", async () => {
    signIn();

    const res = await del("http://localhost:3000/api/chat/runs/backup");

    expect(res.status).toBe(400);
  });
});
