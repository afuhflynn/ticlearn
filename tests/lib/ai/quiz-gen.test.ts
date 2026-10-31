import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/orchestrator", () => ({
  generate: vi.fn(),
  generateCritical: vi.fn(),
  generateTextCritical: vi.fn(),
  generateTextWithFallback: vi.fn(),
  OrchestratorError: class OrchestratorError extends Error {
    task: string;
    modelErrors: Array<{ model: string; error: string }>;
    constructor(
      message: string,
      task: string,
      modelErrors: Array<{ model: string; error: string }>,
    ) {
      super(message);
      this.name = "OrchestratorError";
      this.task = task;
      this.modelErrors = modelErrors;
    }
  },
}));

vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn() },
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
  VerbosityLevel: { ERRORS: 0 },
}));

vi.mock("tesseract.js", () => ({
  default: { recognize: vi.fn() },
}));

vi.mock("uploadthing/server", () => ({
  UTApi: class {
    getFileUrls = vi.fn();
    deleteFiles = vi.fn();
  },
}));

const orchestrator = await import("@/lib/ai/orchestrator");
const { generateQuizFromNote, QUIZ_TOKENS_PER_QUESTION } =
  await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");

const mcq = {
  type: "MCQ",
  question: "What is 2 + 2?",
  options: ["1", "2", "3", "4"],
  correctAnswer: "4",
  explanation: "Basic addition.",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(orchestrator.generateCritical).mockResolvedValue({
    object: { questions: [mcq] },
    modelId: "test-model",
    fromCache: false,
  } as never);
});

describe("generateQuizFromNote (covers: quiz output cap)", () => {
  it("scales maxOutputTokens with the requested question count", async () => {
    await generateQuizFromNote("Some note content.", {
      questionCount: 50,
      questionTypes: "MIXED",
    });

    const call = vi.mocked(orchestrator.generateCritical).mock.calls[0]?.[0];
    expect(call?.modelOptions?.maxOutputTokens).toBeGreaterThanOrEqual(
      50 * QUIZ_TOKENS_PER_QUESTION,
    );
  });

  it("keeps the prompt file floor for small quizzes", async () => {
    await generateQuizFromNote("Some note content.", {
      questionCount: 5,
      questionTypes: "MIXED",
    });

    const call = vi.mocked(orchestrator.generateCritical).mock.calls[0]?.[0];
    // 5 questions need fewer tokens than the file cap, so the cap wins.
    expect(call?.modelOptions?.maxOutputTokens).toBe(2048);
  });

  it("throws instead of swallowing a model failure", async () => {
    vi.mocked(orchestrator.generateCritical).mockRejectedValueOnce(
      new Error("all models down"),
    );

    await expect(
      generateQuizFromNote("Some note content.", {
        questionCount: 10,
        questionTypes: "MIXED",
      }),
    ).rejects.toThrow(/Quiz generation failed/);
  });

  it("returns normalized questions on success", async () => {
    const { questions, fromCache } = await generateQuizFromNote(
      "Some note content.",
      { questionCount: 10, questionTypes: "MIXED" },
    );

    expect(questions).toHaveLength(1);
    expect(questions[0]?.question).toBe("What is 2 + 2?");
    expect(fromCache).toBe(false);
  });
});
