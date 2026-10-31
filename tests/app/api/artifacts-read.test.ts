import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/artifacts/route";

/**
 * The unified art read (spec 0030, AC-1, AC-2, AC-3, AC-5).
 *
 * Owner only: no session gives 401, a foreign note or answer id reads as
 * missing with a 404 and no data, and the owner gets scans derived from
 * Page rows plus drawn rows in read order.
 */

const getSessionMock = vi.hoisted(() => vi.fn());
const noteFindFirst = vi.hoisted(() => vi.fn());
const pageFindMany = vi.hoisted(() => vi.fn());
const pageCount = vi.hoisted(() => vi.fn());
const artifactFindMany = vi.hoisted(() => vi.fn());
const answerFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findFirst: noteFindFirst },
    page: { findMany: pageFindMany, count: pageCount },
    visualArtifact: { findMany: artifactFindMany },
    quizAttemptAnswer: { findFirst: answerFindFirst },
  },
}));

const userId = "student-1";

function session() {
  getSessionMock.mockResolvedValue({ user: { id: userId } });
}

beforeEach(() => {
  getSessionMock.mockReset();
  noteFindFirst.mockReset();
  pageFindMany.mockReset();
  pageCount.mockReset();
  artifactFindMany.mockReset();
  answerFindFirst.mockReset();
  getSessionMock.mockResolvedValue(null);
});

function get(url: string) {
  return GET(new Request(url));
}

describe("GET /api/artifacts (spec 0030)", () => {
  it("answers 401 when there is no session (covers: AC-5)", async () => {
    const response = await get("http://localhost/api/artifacts?noteId=n1");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(noteFindFirst).not.toHaveBeenCalled();
  });

  it("answers 400 when noteId and answerId are both missing or both given (covers: AC-5)", async () => {
    session();

    const neither = await get("http://localhost/api/artifacts");
    expect(neither.status).toBe(400);

    const both = await get(
      "http://localhost/api/artifacts?noteId=n1&answerId=a1",
    );
    expect(both.status).toBe(400);
  });

  it("answers 404 with no data for a foreign note id (covers: AC-5)", async () => {
    session();
    noteFindFirst.mockResolvedValue(null);

    const response = await get(
      "http://localhost/api/artifacts?noteId=foreign-note",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("answers 404 with no data for a foreign answer id (covers: AC-5)", async () => {
    session();
    answerFindFirst.mockResolvedValue(null);

    const response = await get(
      "http://localhost/api/artifacts?answerId=foreign-answer",
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("returns scans plus drawn rows in read order for the owner (covers: AC-1, AC-3)", async () => {
    session();
    noteFindFirst.mockResolvedValue({ id: "note-1" });
    pageFindMany.mockResolvedValue([
      { pageNumber: 1, pageImageUrl: "/demo/p1.svg", hasVisual: true },
      { pageNumber: 2, pageImageUrl: null, hasVisual: false },
      { pageNumber: 3, pageImageUrl: "/demo/p3.svg", hasVisual: true },
    ]);
    pageCount.mockResolvedValue(3);
    artifactFindMany.mockResolvedValue([
      {
        id: "art-1",
        format: "mermaid",
        payload: "graph TD\n A-->B",
        altText: "Two boxes with an arrow.",
        sourcePage: 1,
        createdAt: new Date("2026-10-30T10:00:00.000Z"),
      },
    ]);

    const response = await get("http://localhost/api/artifacts?noteId=note-1");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.noteId).toBe("note-1");
    expect(body.total).toBe(3);
    expect(body.scans.map((s: { pageNumber: number }) => s.pageNumber)).toEqual(
      [1, 3],
    );
    expect(body.scans[0]).toMatchObject({
      kind: "scan",
      pageNumber: 1,
      imageUrl: "/demo/p1.svg",
    });
    expect(body.drawn).toHaveLength(1);
    expect(body.drawn[0]).toMatchObject({
      kind: "drawn",
      id: "art-1",
      format: "mermaid",
      sourcePage: 1,
    });
  });

  it("returns drawn retry art for the owner answer (covers: AC-2)", async () => {
    session();
    answerFindFirst.mockResolvedValue({ id: "answer-1" });
    artifactFindMany.mockResolvedValue([
      {
        id: "art-9",
        format: "svg",
        payload: "<svg></svg>",
        altText: "A circle.",
        sourcePage: null,
        createdAt: new Date("2026-10-30T11:00:00.000Z"),
      },
    ]);

    const response = await get(
      "http://localhost/api/artifacts?answerId=answer-1",
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.answerId).toBe("answer-1");
    expect(body.drawn).toHaveLength(1);
    expect(body.drawn[0]).toMatchObject({ id: "art-9", format: "svg" });
  });
});
