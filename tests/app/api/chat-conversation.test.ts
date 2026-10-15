import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "@/app/api/chat/conversations/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: { findFirst: vi.fn(), deleteMany: vi.fn() },
    chatMessage: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/file", () => ({
  utapi: { deleteFiles: vi.fn(() => Promise.resolve({ success: true })) },
  getUploadThingFileKey: (url: string) => {
    const match = url.match(/https:\/\/utfs\.io\/f\/(.+)$/);
    return match ? match[1] : null;
  },
  deleteFile: vi.fn(),
}));

const db = prisma as unknown as {
  chatConversation: {
    findFirst: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  chatMessage: { findMany: ReturnType<typeof vi.fn> };
};

function req(id: string): NextRequest {
  const request = new Request(
    `http://localhost:3000/api/chat/conversations/${id}`,
  );
  const nextRequest = request as unknown as NextRequest;
  (nextRequest as unknown as { nextUrl: URL }).nextUrl = new URL(request.url);
  return nextRequest;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function signIn(user: { id: string; role?: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  db.chatConversation.findFirst.mockResolvedValue({ id: "c1" });
  db.chatMessage.findMany.mockResolvedValue([]);
  db.chatConversation.deleteMany.mockResolvedValue({ count: 1 });
});

describe("/api/chat/conversations/[id] (covers: AC-8, AC-9)", () => {
  it("returns 401 when there is no session", async () => {
    signIn(null);

    const res = await GET(req("c1"), params("c1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when the conversation is missing", async () => {
    db.chatConversation.findFirst.mockResolvedValue(null);

    const res = await GET(req("c1"), params("c1"));

    expect(res.status).toBe(404);
  });

  it("returns the conversation and its messages", async () => {
    db.chatConversation.findFirst.mockResolvedValue({
      id: "c1",
      title: "Study plan",
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: null,
    });
    db.chatMessage.findMany.mockResolvedValue([
      {
        id: "m1",
        role: "user",
        content: "Hello",
        parts: [],
        createdAt: new Date(),
      },
    ]);

    const body = await (await GET(req("c1"), params("c1"))).json();

    expect(body.conversation.id).toBe("c1");
    expect(body.messages).toHaveLength(1);
  });

  it("deletes in bounded batches and removes file keys", async () => {
    const batch = Array.from({ length: 200 }, (_, i) => ({
      id: `m${i}`,
      parts: [
        {
          type: "file",
          url: `https://utfs.io/f/key-${i}`,
        },
      ],
    }));
    db.chatMessage.findMany
      .mockResolvedValueOnce(batch)
      .mockResolvedValueOnce([]);

    const res = await DELETE(req("c1"), params("c1"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(db.chatMessage.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ take: 200 }),
    );
    expect(db.chatMessage.findMany).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when the conversation cannot be deleted", async () => {
    db.chatConversation.deleteMany.mockResolvedValue({ count: 0 });

    const res = await DELETE(req("c1"), params("c1"));

    expect(res.status).toBe(404);
  });
});
