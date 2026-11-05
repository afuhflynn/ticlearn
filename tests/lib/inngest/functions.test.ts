import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  noteFindUnique: vi.fn(),
  quizFindUnique: vi.fn(),
  quizFindMany: vi.fn(),
  quizUpdate: vi.fn(async () => ({})),
  createMany: vi.fn(async () => ({})),
  creditFindFirst: vi.fn(),
  genQuiz: vi.fn(),
  spendCredits: vi.fn(async () => ({ balance: 150 })),
  refundQuizReserve: vi.fn(async () => ({ balance: 200, duplicate: false })),
  stepRun: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: (_opts: unknown, fn: unknown) => ({ run: fn }),
  },
}));

// The shared setup stubs this module; this suite tests the real one.
vi.mock("@/lib/inngest/functions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/inngest/functions")>();
  return actual;
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findUnique: fns.noteFindUnique },
    quiz: {
      findUnique: fns.quizFindUnique,
      findMany: fns.quizFindMany,
      update: fns.quizUpdate,
    },
    quizQuestion: { createMany: fns.createMany },
    creditTransaction: { findFirst: fns.creditFindFirst },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/ai", () => ({
  generateQuizFromNote: fns.genQuiz,
  QUIZ_BATCH_SIZE: 15,
  extractTextFromPDF: vi.fn(),
  extractTextFromImage: vi.fn(),
  extractTextFromWord: vi.fn(),
  summarizeText: vi.fn(),
}));

vi.mock("@/lib/grounded-pages", () => ({
  formatPageContext: vi.fn(() => ""),
  getGroundedPageInputs: vi.fn(async () => []),
}));

vi.mock("@/lib/credits", () => ({
  spendCredits: fns.spendCredits,
  refundQuizReserve: fns.refundQuizReserve,
}));

vi.mock("@/lib/topics", () => ({
  attachTopicsToNote: vi.fn(),
}));

import { generateQuiz, sweepStaleQuizzes } from "@/lib/inngest/functions";

type Runner = (args: {
  event: { data: Record<string, unknown> };
  step: unknown;
}) => Promise<unknown>;

const runGenerate = (data: Record<string, unknown>) =>
  (generateQuiz as unknown as { run: Runner }).run({
    event: {
      data: {
        noteId: "note-1",
        quizId: "quiz-1",
        questionCount: 5,
        questionTypes: "MIXED",
        wantsDebit: true,
        quizCost: 50,
        userId: "student-1",
        noteTitle: "Bio notes",
        ...data,
      },
    },
    step: { run: fns.stepRun },
  });

const runSweep = () =>
  (
    sweepStaleQuizzes as unknown as {
      run: (args: {
        event: { data: Record<string, unknown> };
        step: unknown;
      }) => Promise<unknown>;
    }
  ).run({ event: { data: {} }, step: { run: fns.stepRun } });

type UpdateCall = [{ where: { id: string }; data: Record<string, unknown> }];
type CreateManyCall = [{ data: Array<Record<string, unknown>> }];
type GenQuizCall = [string, { questionCount: number }];

function updateDatas() {
  return (fns.quizUpdate.mock.calls as unknown as UpdateCall[]).map(
    (call) => call[0].data,
  );
}

function createdRows() {
  return (fns.createMany.mock.calls as unknown as CreateManyCall[]).flatMap(
    (call) => call[0].data,
  );
}

function genQuizCalls() {
  return fns.genQuiz.mock.calls as unknown as GenQuizCall[];
}

function mcq(index: number) {
  return {
    type: "MCQ",
    question: `Question ${index}?`,
    options: ["A", "B", "C", "D"],
    correctAnswer: "A",
    explanation: `Why ${index}.`,
    hint: "",
    sourcePages: [] as number[],
    marks: 1,
    markSchemeMd: "",
    examinerNote: "",
  };
}

function makeQuestions(count: number) {
  return Array.from({ length: count }, (_, i) => mcq(i));
}

beforeEach(() => {
  vi.clearAllMocks();
  fns.noteFindUnique.mockResolvedValue({
    id: "note-1",
    userId: "student-1",
    extractedText: "Cells are the basic unit of life.".repeat(20),
  });
  fns.quizFindUnique.mockResolvedValue({ status: "GENERATING" });
  fns.quizFindMany.mockResolvedValue([]);
  fns.quizUpdate.mockResolvedValue({});
  fns.createMany.mockResolvedValue({ count: 0 });
  fns.creditFindFirst.mockResolvedValue(null);
  fns.genQuiz.mockImplementation(async (_text: string, opts: any) => ({
    questions: makeQuestions(opts.questionCount),
    fromCache: false,
  }));
  fns.spendCredits.mockResolvedValue({ balance: 150 });
  fns.refundQuizReserve.mockResolvedValue({ balance: 200, duplicate: false });
});

describe("generateQuiz progress writes (spec 0042, covers: AC-1)", () => {
  it("writes GENERATING with a zero count before the first batch lands", async () => {
    await runGenerate({});

    expect(fns.quizUpdate).toHaveBeenCalledWith({
      where: { id: "quiz-1" },
      data: {
        status: "GENERATING",
        buildStage: "GENERATING",
        builtCount: 0,
        buildTotal: 5,
      },
    });
  });

  it("counts each batch up as rows land", async () => {
    await runGenerate({ questionCount: 20 });

    const counts = updateDatas()
      .filter((data) => data.buildStage === "GENERATING")
      .map((data) => data.builtCount);
    expect(counts).toEqual([0, 15, 20]);
  });
});

describe("generateQuiz finish (spec 0042, covers: AC-3)", () => {
  it("persists questions in order and flips to READY through SAVING", async () => {
    await runGenerate({});

    expect(fns.createMany).toHaveBeenCalledTimes(1);
    const rows = createdRows();
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.order)).toEqual([0, 1, 2, 3, 4]);

    const stages = updateDatas();
    expect(stages).toContainEqual(
      expect.objectContaining({ buildStage: "SAVING" }),
    );
    expect(stages[stages.length - 1]).toMatchObject({
      status: "READY",
      questionCount: 5,
      builtCount: 5,
      buildError: null,
    });
  });
});

describe("generateQuiz cutoff retry (spec 0042, covers: AC-2)", () => {
  it("retries a cut batch once with a smaller count, then continues", async () => {
    fns.genQuiz
      .mockResolvedValueOnce({
        questions: makeQuestions(8),
        fromCache: false,
      })
      .mockImplementation(async (_text: string, opts: any) => ({
        questions: makeQuestions(opts.questionCount),
        fromCache: false,
      }));

    await runGenerate({ questionCount: 15 });

    expect(fns.genQuiz).toHaveBeenCalledTimes(2);
    expect(genQuizCalls()[1]?.[1]).toMatchObject({ questionCount: 7 });

    const totalRows = createdRows().length;
    expect(totalRows).toBe(15);

    const last = updateDatas().at(-1);
    expect(last).toMatchObject({ status: "READY", questionCount: 15 });
  });

  it("fails with exits when the ask is too small for a smaller retry", async () => {
    fns.genQuiz.mockRejectedValueOnce(
      new Error("Response stopped: finish reason length"),
    );

    await expect(runGenerate({ questionCount: 5 })).rejects.toThrow();
    expect(fns.genQuiz).toHaveBeenCalledTimes(1);

    expect(fns.quizUpdate).toHaveBeenCalledWith({
      where: { id: "quiz-1" },
      data: {
        status: "ERROR",
        buildStage: null,
        buildError: "That set came out too long so it stopped short.",
      },
    });
    expect(fns.refundQuizReserve).toHaveBeenCalledTimes(1);
    expect(fns.refundQuizReserve).toHaveBeenCalledWith({
      userId: "student-1",
      quizId: "quiz-1",
      amount: 50,
    });
    expect(fns.spendCredits).not.toHaveBeenCalled();
  });

  it("reads a plain failure as a generic build error", async () => {
    fns.genQuiz.mockRejectedValueOnce(new Error("plain boom"));

    await expect(runGenerate({ questionCount: 5 })).rejects.toThrow(
      "plain boom",
    );

    expect(fns.quizUpdate).toHaveBeenCalledWith({
      where: { id: "quiz-1" },
      data: {
        status: "ERROR",
        buildStage: null,
        buildError: "Quiz build failed.",
      },
    });
  });
});

describe("generateQuiz status guard (spec 0042, covers: AC-5)", () => {
  it("drops late batches once the run already failed", async () => {
    fns.quizFindUnique
      .mockResolvedValueOnce({ status: "GENERATING" })
      .mockResolvedValue({ status: "ERROR" });

    const result = (await runGenerate({})) as { dropped?: boolean };

    expect(result.dropped).toBe(true);
    expect(fns.createMany).not.toHaveBeenCalled();
    expect(updateDatas()).not.toContainEqual(
      expect.objectContaining({ status: "READY" }),
    );
    expect(fns.refundQuizReserve).not.toHaveBeenCalled();
  });
});

describe("generateQuiz credit handling (spec 0042, covers: AC-6)", () => {
  it("debits once under the quiz id on a fresh build", async () => {
    await runGenerate({});

    expect(fns.spendCredits).toHaveBeenCalledTimes(1);
    expect(fns.spendCredits).toHaveBeenCalledWith({
      userId: "student-1",
      amount: 50,
      type: "QUIZ_GENERATION",
      description: expect.stringContaining("Bio notes"),
      referenceId: "quiz-1",
    });
    expect(fns.refundQuizReserve).not.toHaveBeenCalled();
  });

  it("refunds the reserve instead of debiting on a cache hit", async () => {
    fns.genQuiz.mockResolvedValue({
      questions: makeQuestions(5),
      fromCache: true,
    });

    await runGenerate({});

    expect(fns.refundQuizReserve).toHaveBeenCalledTimes(1);
    expect(fns.refundQuizReserve).toHaveBeenCalledWith({
      userId: "student-1",
      quizId: "quiz-1",
      amount: 50,
    });
    expect(fns.spendCredits).not.toHaveBeenCalled();
  });
});

describe("sweepStaleQuizzes (spec 0042, covers: AC-5)", () => {
  it("fails a stale build and refunds its reserve once", async () => {
    fns.quizFindMany.mockResolvedValue([{ id: "old-1", userId: "student-9" }]);
    fns.quizFindUnique.mockResolvedValue({ status: "GENERATING" });
    fns.creditFindFirst.mockResolvedValue({ amount: -50 });

    const result = (await runSweep()) as { success: boolean; swept: number };

    expect(result).toEqual({ success: true, swept: 1 });
    expect(fns.quizUpdate).toHaveBeenCalledWith({
      where: { id: "old-1" },
      data: {
        status: "ERROR",
        buildStage: null,
        buildError: "Quiz build failed.",
      },
    });
    expect(fns.refundQuizReserve).toHaveBeenCalledTimes(1);
    expect(fns.refundQuizReserve).toHaveBeenCalledWith({
      userId: "student-9",
      quizId: "old-1",
      amount: 50,
    });
  });

  it("leaves fresh builds alone", async () => {
    fns.quizFindMany.mockResolvedValue([]);

    const result = (await runSweep()) as { success: boolean; swept: number };

    expect(result).toEqual({ success: true, swept: 0 });
    expect(fns.quizUpdate).not.toHaveBeenCalled();
  });

  it("skips a row that already finished", async () => {
    fns.quizFindMany.mockResolvedValue([{ id: "done-1", userId: "s1" }]);
    fns.quizFindUnique.mockResolvedValue({ status: "READY" });

    const result = (await runSweep()) as { success: boolean; swept: number };

    expect(result).toEqual({ success: true, swept: 0 });
    expect(fns.quizUpdate).not.toHaveBeenCalled();
    expect(fns.refundQuizReserve).not.toHaveBeenCalled();
  });

  it("sweeps on a ten minute budget", async () => {
    let seen: Date | null = null;
    fns.quizFindMany.mockImplementation(async (args: any) => {
      seen = args.where.buildStartedAt.lt;
      return [];
    });

    await runSweep();

    expect(seen).not.toBeNull();
    expect(
      Math.abs((seen as unknown as Date).getTime() - (Date.now() - 600_000)),
    ).toBeLessThan(60_000);
  });
});
