import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/visual-analysis/[noteId]/route";

/**
 * The visual analysis read endpoint (spec 0027, AC-7).
 *
 * Owner only: no session gives 401, a note the caller does not own gives 404
 * (indistinguishable from missing), and the owner's pages plus analyses come
 * back in page order.
 */

const getSessionMock = vi.hoisted(() => vi.fn());
const noteFindFirst = vi.hoisted(() => vi.fn());
const pageFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findFirst: noteFindFirst },
    page: { findMany: pageFindMany },
  },
}));

const pagesPayload = [
  {
    id: "page-1",
    pageNumber: 1,
    pageImageUrl: "https://blob.example/page-1.png",
    hasVisual: true,
    analysedAt: new Date("2026-10-29T10:00:00.000Z"),
    analyses: [
      {
        id: "analysis-1",
        visualType: "DIAGRAM",
        description: "A flow chart of process scheduling",
        confidence: 0.9,
        basetenCostXaf: 25,
        status: "COMPLETED",
        createdAt: new Date("2026-10-29T10:01:00.000Z"),
      },
    ],
  },
  {
    id: "page-2",
    pageNumber: 2,
    pageImageUrl: null,
    hasVisual: false,
    analysedAt: new Date("2026-10-29T10:00:00.000Z"),
    analyses: [],
  },
];

beforeEach(() => {
  getSessionMock.mockReset();
  noteFindFirst.mockReset();
  pageFindMany.mockReset();
  getSessionMock.mockResolvedValue(null);
});

describe("GET /api/visual-analysis/[noteId] (spec 0027)", () => {
  it("answers 401 when there is no session", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ noteId: "note-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(noteFindFirst).not.toHaveBeenCalled();
  });

  it("answers 404 when the note is missing or owned by someone else", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    noteFindFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ noteId: "note-1" }),
    });

    expect(noteFindFirst).toHaveBeenCalledWith({
      where: { id: "note-1", userId: "user-42" },
      select: { id: true },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Note not found" });
    expect(pageFindMany).not.toHaveBeenCalled();
  });

  it("returns the owner's pages with their analyses in page order", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    noteFindFirst.mockResolvedValue({ id: "note-1" });
    pageFindMany.mockResolvedValue(pagesPayload);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ noteId: "note-1" }),
    });

    expect(pageFindMany).toHaveBeenCalledWith({
      where: { noteId: "note-1" },
      orderBy: { pageNumber: "asc" },
      include: expect.objectContaining({
        analyses: expect.objectContaining({ take: 1 }),
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.noteId).toBe("note-1");
    expect(body.pages).toHaveLength(2);
    expect(body.pages[0].pageNumber).toBe(1);
    expect(body.pages[0].analysis.visualType).toBe("DIAGRAM");
    expect(body.pages[0].analysis.description).toBe(
      "A flow chart of process scheduling",
    );
    expect(body.pages[0].analysis.status).toBe("COMPLETED");
    expect(body.pages[1].pageNumber).toBe(2);
    expect(body.pages[1].analysis).toBeNull();
  });

  it("answers 500 without leaking the cause when the read breaks", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    noteFindFirst.mockResolvedValue({ id: "note-1" });
    pageFindMany.mockRejectedValue(new Error("connection refused"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ noteId: "note-1" }),
    });

    expect(log).toHaveBeenCalled();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch visual analysis",
    });
    log.mockRestore();
  });
});
