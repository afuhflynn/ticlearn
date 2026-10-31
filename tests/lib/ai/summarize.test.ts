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
const { summarizeText } =
  await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
const { MAX_CHARACTERS_FOR_SUMMARY_CONTEXT } = await import("@/constants");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(orchestrator.generate).mockResolvedValue({
    object: {
      summary: "Brief.",
      topics: ["a", "b", "c"],
      keyPoints: ["p1", "p2", "p3"],
    },
    modelId: "test-model",
    fromCache: false,
  } as never);
});

describe("summarizeText (covers: note processing NoObjectGenerated fix)", () => {
  it("truncates huge notes to the summary context", async () => {
    const huge = "x".repeat(MAX_CHARACTERS_FOR_SUMMARY_CONTEXT + 5000);
    await summarizeText(huge);

    const call = vi.mocked(orchestrator.generate).mock.calls[0]?.[0];
    expect(call?.prompt?.length).toBeLessThanOrEqual(
      MAX_CHARACTERS_FOR_SUMMARY_CONTEXT + 2000,
    );
  });

  it("requests a 4096 output cap so reasoning plus JSON fit", async () => {
    await summarizeText("Some note content.");

    const call = vi.mocked(orchestrator.generate).mock.calls[0]?.[0];
    expect(call?.modelOptions?.maxOutputTokens).toBe(4096);
  });
});
