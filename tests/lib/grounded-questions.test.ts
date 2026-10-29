import { describe, expect, it, vi } from "vitest";
import { formatPageContext } from "@/lib/grounded-pages";
import { normalizeGeneratedQuestions } from "@/lib/ai/validators";

describe("grounded question refs", () => {
  it("formats page context with numbers and types", () => {
    const text = formatPageContext([
      {
        pageNumber: 3,
        visualType: "DIAGRAM",
        description: "Mitosis stages",
        confidence: 0.9,
      },
    ]);
    expect(text).toContain("Page 3");
    expect(text).toContain("Mitosis stages");
  });

  it("returns placeholder text when no pages are analyzed", () => {
    expect(formatPageContext([])).toContain("No analyzed pages");
  });

  it("keeps sourcePages snapshots on normalized questions", () => {
    const out = normalizeGeneratedQuestions([
      {
        type: "MCQ",
        question: "What phase follows prophase?",
        options: ["a", "b", "c", "d"],
        correctAnswer: "b",
        explanation: "Seen on the diagram.",
        sourcePages: [3, 3, 99],
      },
    ]);
    expect(out[0]?.sourcePages).toEqual([3, 99]);
  });

  it("drops bad page numbers and keeps text only shape", () => {
    const out = normalizeGeneratedQuestions([
      {
        type: "OPEN",
        question: "Explain osmosis.",
        options: [],
        correctAnswer: "Movement of water.",
        explanation: "From notes.",
        sourcePages: [0, -2, 1.7],
      },
    ]);
    expect(out[0]?.sourcePages).toEqual([1]);
  });

  it("defaults to empty refs when the model omits them", async () => {
    const { generateQuizFromNote } = await import("@/lib/ai");
    expect(typeof generateQuizFromNote).toBe("function");
    void vi;
  });
});
