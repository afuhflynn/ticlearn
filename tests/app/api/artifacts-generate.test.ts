import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/artifacts/generate/route";

/**
 * The draw endpoint (spec 0030, AC-4, AC-5, AC-6).
 *
 * Owner only, the cap runs before the model call, invalid model output
 * never stores a row, and draws cost no debit in this phase.
 */

const getSessionMock = vi.hoisted(() => vi.fn());
const answerFindFirst = vi.hoisted(() => vi.fn());
const noteFindFirst = vi.hoisted(() => vi.fn());
const artifactCount = vi.hoisted(() => vi.fn());
const artifactCreate = vi.hoisted(() => vi.fn());
const generateMock = vi.hoisted(() => vi.fn());
const logUsageMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quizAttemptAnswer: { findFirst: answerFindFirst },
    note: { findFirst: noteFindFirst },
    visualArtifact: { count: artifactCount, create: artifactCreate },
  },
}));

vi.mock("@/lib/ai/orchestrator", () => ({
  generate: generateMock,
}));

vi.mock("@/lib/ai/usage", () => ({
  logUsage: logUsageMock,
}));

const userId = "student-1";

function session() {
  getSessionMock.mockResolvedValue({ user: { id: userId } });
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/artifacts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  getSessionMock.mockReset();
  answerFindFirst.mockReset();
  noteFindFirst.mockReset();
  artifactCount.mockReset();
  artifactCreate.mockReset();
  generateMock.mockReset();
  logUsageMock.mockReset();
  getSessionMock.mockResolvedValue(null);
  logUsageMock.mockResolvedValue(undefined);
});

describe("POST /api/artifacts/generate (spec 0030)", () => {
  it("answers 401 when there is no session (covers: AC-5)", async () => {
    const response = await post({ noteId: "n1", concept: "field lines" });

    expect(response.status).toBe(401);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("answers 400 for an empty concept or a missing key (covers: AC-4)", async () => {
    session();

    const empty = await post({ noteId: "n1", concept: "" });
    expect(empty.status).toBe(400);

    const keyless = await post({ concept: "field lines" });
    expect(keyless.status).toBe(400);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a foreign note id with no model call (covers: AC-5)", async () => {
    session();
    noteFindFirst.mockResolvedValue(null);

    const response = await post({ noteId: "foreign", concept: "rays" });

    expect(response.status).toBe(404);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a foreign answer id with no model call (covers: AC-5)", async () => {
    session();
    answerFindFirst.mockResolvedValue(null);

    const response = await post({ answerId: "foreign", concept: "rays" });

    expect(response.status).toBe(404);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("answers 429 on the fourth draw and logs the cap without storing (covers: AC-6)", async () => {
    session();
    noteFindFirst.mockResolvedValue({
      id: "note-1",
      extractedText: "text",
      summary: "summary",
    });
    artifactCount.mockResolvedValue(3);

    const response = await post({ noteId: "note-1", concept: "field lines" });

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("cap");
    expect(generateMock).not.toHaveBeenCalled();
    expect(artifactCreate).not.toHaveBeenCalled();
    expect(logUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "visual_draw",
        errorCode: "cap_reached",
      }),
    );
  });

  it("stores the sanitized draw and answers 200 on the happy path (covers: AC-4)", async () => {
    session();
    noteFindFirst.mockResolvedValue({
      id: "note-1",
      extractedText: "text",
      summary: "summary",
    });
    artifactCount.mockResolvedValue(0);
    generateMock.mockResolvedValue({
      object: {
        format: "mermaid",
        payload: "flowchart TD\n A-->B",
        altText: "Two boxes with an arrow.",
      },
      modelId: "muse-spark-1.3",
    });
    artifactCreate.mockResolvedValue({ id: "art-1" });

    const response = await post({ noteId: "note-1", concept: "field lines" });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      id: "art-1",
      format: "mermaid",
    });
    expect(artifactCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, noteId: "note-1" }),
      }),
    );
  });

  it("strips scripts from stored markup before storing (covers: AC-5)", async () => {
    session();
    noteFindFirst.mockResolvedValue({
      id: "note-1",
      extractedText: "text",
      summary: "summary",
    });
    artifactCount.mockResolvedValue(0);
    generateMock.mockResolvedValue({
      object: {
        format: "svg",
        payload:
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="4"/></svg>',
        altText: "A circle.",
      },
      modelId: "muse-spark-1.3",
    });
    artifactCreate.mockResolvedValue({ id: "art-2" });

    const response = await post({ noteId: "note-1", concept: "a circle" });

    expect(response.status).toBe(200);
    const stored = artifactCreate.mock.calls[0]?.[0] as {
      data: { payload: string };
    };
    expect(stored.data.payload).not.toContain("<script");
    expect(stored.data.payload).toContain("<circle");
  });

  it("degrades to text with no stored row when the model output is invalid (covers: AC-4)", async () => {
    session();
    noteFindFirst.mockResolvedValue({
      id: "note-1",
      extractedText: "text",
      summary: "summary",
    });
    artifactCount.mockResolvedValue(0);
    generateMock.mockResolvedValue({
      object: {
        format: "svg",
        payload: "just some prose, no svg at all",
        altText: "A circle.",
      },
      modelId: "muse-spark-1.3",
    });

    const response = await post({ noteId: "note-1", concept: "a circle" });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("invalid");
    expect(artifactCreate).not.toHaveBeenCalled();
  });
});
