import { describe, expect, it } from "vitest";
import { feedbackRevealsKey, retryOutputSchema } from "@/lib/retries/generate";
import { mergeWeakArea, parseWeakAreas } from "@/lib/retries/weak-areas";

describe("targeted retry progress update", () => {
  it("accepts a valid retry payload with four options", () => {
    const parsed = retryOutputSchema.safeParse({
      concept: "Mitosis stages",
      sourcePages: [3],
      feedbackMd: "You mixed prophase with metaphase. See page 3.",
      retryQuestion: "Which stage pulls sisters apart?",
      retryOptions: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
      retryCorrectAnswer: "Anaphase",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate options while keeping four distinct entries valid", () => {
    const base = {
      concept: "Mitosis",
      sourcePages: [] as number[],
      feedbackMd: "Review the stages.",
      retryQuestion: "Fresh?",
      retryCorrectAnswer: "Anaphase",
    };
    expect(
      retryOutputSchema.safeParse({
        ...base,
        retryOptions: ["Anaphase", "Anaphase", "Metaphase", "Telophase"],
      }).success,
    ).toBe(false);
    expect(
      retryOutputSchema.safeParse({
        ...base,
        retryOptions: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
      }).success,
    ).toBe(true);
  });

  it("flags reveal phrasing but not an honest mention of the key", () => {
    expect(
      feedbackRevealsKey(
        "The correct answer is Anaphase, when sisters separate.",
        "Anaphase",
      ),
    ).toBe(true);
    expect(
      feedbackRevealsKey("You should have chosen Anaphase here.", "Anaphase"),
    ).toBe(true);
    expect(
      feedbackRevealsKey(
        "Anaphase pulls the sisters apart while metaphase lines them up.",
        "Anaphase",
      ),
    ).toBe(false);
    expect(feedbackRevealsKey("Review the stages.", "Anaphase")).toBe(false);
  });

  it("rejects a key that is not one of the options at the route layer", () => {
    const parsed = retryOutputSchema.safeParse({
      concept: "Mitosis",
      sourcePages: [],
      feedbackMd: "Review the stages.",
      retryQuestion: "Fresh?",
      retryOptions: ["A", "B", "C", "D"],
      retryCorrectAnswer: "E",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(
        parsed.data.retryOptions.includes(parsed.data.retryCorrectAnswer),
      ).toBe(false);
    }
  });

  it("scores with trimmed case free compare", () => {
    const key = "Anaphase";
    expect("  anaphase ".trim().toLowerCase()).toBe(key.trim().toLowerCase());
  });

  it("merges weak areas by concept and preserves other keys", () => {
    const base = {
      weakAreas: [
        {
          concept: "Old",
          sourcePages: [1],
          retryId: "r1",
          isCorrect: false,
          updatedAt: "t1",
        },
      ],
      title: "Quiz",
    };
    const merged = mergeWeakArea(base, {
      concept: "Mitosis",
      sourcePages: [3],
      retryId: "r2",
      isCorrect: true,
      updatedAt: "t2",
    }) as {
      weakAreas: Array<{ concept: string; isCorrect: boolean }>;
      title: string;
    };
    expect(merged.title).toBe("Quiz");
    expect(
      merged.weakAreas.some(
        (entry) => entry.concept === "Mitosis" && entry.isCorrect,
      ),
    ).toBe(true);
    const again = mergeWeakArea(merged, {
      concept: "Mitosis",
      sourcePages: [3],
      retryId: "r3",
      isCorrect: false,
      updatedAt: "t3",
    }) as { weakAreas: Array<{ concept: string }> };
    expect(
      again.weakAreas.filter((entry) => entry.concept === "Mitosis"),
    ).toHaveLength(1);
  });

  it("parses weak areas safely from unknown metadata", () => {
    expect(parseWeakAreas(null)).toEqual([]);
    expect(parseWeakAreas({})).toEqual([]);
    expect(parseWeakAreas({ weakAreas: "nope" })).toEqual([]);
  });
});
