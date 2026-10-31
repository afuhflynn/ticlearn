import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/quizzes/grade/route";
import { gradeOpenAnswer } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/ai", () => ({
  gradeOpenAnswer: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quizQuestion: { findFirst: vi.fn() },
  },
}));

const db = prisma as unknown as {
  quizQuestion: { findFirst: ReturnType<typeof vi.fn> };
};

function signIn(user: { id: string } | null) {
  vi.mocked(auth.api.getSession).mockResolvedValue({ user } as never);
}

function grade(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/quizzes/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const mcqBase = {
  questionId: "question-1",
  question: "Capital of France?",
  type: "MCQ",
  correctAnswer: "Paris",
  options: ["London", "Paris"],
};

beforeEach(() => {
  vi.clearAllMocks();
  signIn({ id: "student-1" });
  vi.mocked(gradeOpenAnswer).mockResolvedValue("Score: 90. Good answer.");
  db.quizQuestion.findFirst.mockImplementation(async (args: unknown) => {
    const where = (args as { where?: { id?: string } }).where;
    const id = where?.id ?? "question-1";
    return {
      id,
      marks: 2,
      markSchemeMd: "Point 1 earns 1 mark in your own words.",
      examinerNote: "",
      quiz: { userId: "student-1" },
    };
  });
});

describe("POST /api/quizzes/grade (covers: AC-3, AC-6, AC-7)", () => {
  it("returns 401 without a session", async () => {
    signIn(null);

    const res = await grade({ ...mcqBase, userAnswer: "Paris" });

    expect(res.status).toBe(401);
  });

  it("returns 400 for a missing answer", async () => {
    const res = await grade({ ...mcqBase, userAnswer: "" });

    expect(res.status).toBe(400);
  });

  it("marks a correct MCQ answer without calling the model", async () => {
    const res = await grade({ ...mcqBase, userAnswer: "Paris" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isCorrect).toBe(true);
    expect(body.why).toBe("That's correct.");
    expect(gradeOpenAnswer).not.toHaveBeenCalled();
  });

  it("marks a wrong MCQ answer and names the correct one", async () => {
    const res = await grade({ ...mcqBase, userAnswer: "London" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isCorrect).toBe(false);
    expect(body.why).toContain("Paris");
  });

  it("grades an open answer through the model grader", async () => {
    const res = await grade({
      questionId: "question-2",
      question: "Explain gravity",
      type: "OPEN",
      userAnswer: "A force that pulls things down",
      correctAnswer: "Force",
    });

    expect(res.status).toBe(200);
    expect(gradeOpenAnswer).toHaveBeenCalledWith(
      "Explain gravity",
      "A force that pulls things down",
      "Force",
      "student-1",
    );
    const body = await res.json();
    expect(body.isCorrect).toBe(true);
  });

  it("marks a low scoring open answer as not correct", async () => {
    vi.mocked(gradeOpenAnswer).mockResolvedValue("Score: 40. Too vague.");

    const res = await grade({
      questionId: "question-2",
      question: "Explain gravity",
      type: "OPEN",
      userAnswer: "Stuff falls",
      correctAnswer: "Force",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isCorrect).toBe(false);
  });

  it("returns 400 for an unknown question type (covers: AC-3)", async () => {
    const res = await grade({ ...mcqBase, type: "ESSAY", userAnswer: "x" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when the correct answer is missing (covers: AC-3)", async () => {
    const res = await grade({
      ...mcqBase,
      userAnswer: "Paris",
      correctAnswer: "",
    });

    expect(res.status).toBe(400);
  });

  it("treats feedback with no score as not correct (covers: AC-3)", async () => {
    vi.mocked(gradeOpenAnswer).mockResolvedValue("Nice try, keep going.");

    const res = await grade({
      questionId: "question-2",
      question: "Explain gravity",
      type: "OPEN",
      userAnswer: "Something",
      correctAnswer: "Force",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isCorrect).toBe(false);
  });

  it("trims padding around an MCQ answer before marking (covers: AC-3)", async () => {
    const res = await grade({ ...mcqBase, userAnswer: "  Paris  " });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isCorrect).toBe(true);
    expect(gradeOpenAnswer).not.toHaveBeenCalled();
  });

  it("returns 500 when the model grader fails (covers: AC-3)", async () => {
    vi.mocked(gradeOpenAnswer).mockRejectedValueOnce(new Error("down"));

    const res = await grade({
      questionId: "question-2",
      question: "Explain gravity",
      type: "OPEN",
      userAnswer: "A force",
      correctAnswer: "Force",
    });

    expect(res.status).toBe(500);
  });

  it("reads a foreign question as not found (covers: AC-11)", async () => {
    db.quizQuestion.findFirst.mockResolvedValueOnce({
      id: "question-9",
      marks: 1,
      markSchemeMd: null,
      examinerNote: null,
      quiz: { userId: "other-student" },
    });

    const res = await grade({ ...mcqBase, userAnswer: "Paris" });

    expect(res.status).toBe(404);
  });

  it("reads a missing question as not found (covers: AC-11)", async () => {
    db.quizQuestion.findFirst.mockResolvedValueOnce(null);

    const res = await grade({ ...mcqBase, userAnswer: "Paris" });

    expect(res.status).toBe(404);
  });
});
