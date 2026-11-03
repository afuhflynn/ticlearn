import { describe, expect, it } from "vitest";
import { filterEchoSentences, isEchoOnly } from "@/lib/chat/answer-filter";

describe("filterEchoSentences (covers: AC-2, AC-3)", () => {
  it("drops a short progress sentence and keeps the teaching", () => {
    const raw =
      "I will search the web for photosynthesis. Photosynthesis converts light to chemical energy in chloroplasts.";

    expect(filterEchoSentences(raw)).toBe(
      "Photosynthesis converts light to chemical energy in chloroplasts.",
    );
  });

  it("matches progress phrasing case insensitive as a substring", () => {
    const raw =
      "Let me check that page. The mitochondria produce ATP through respiration.";

    expect(filterEchoSentences(raw)).toBe(
      "The mitochondria produce ATP through respiration.",
    );
  });

  it("keeps a long explanation that mentions searching", () => {
    const teaching =
      "Searching the web is one study habit among many, and this paragraph explains why comparing two textbooks for twenty minutes each evening builds stronger recall than rereading one page over and over again.";
    expect(teaching.length).toBeGreaterThan(160);

    expect(filterEchoSentences(teaching)).toBe(teaching);
  });

  it("handles multiline answers and collapses extra blank lines", () => {
    const raw =
      "I am going to look this up.\n\nThe answer has two parts.\n\nReading that page now.";

    expect(filterEchoSentences(raw)).toBe("The answer has two parts.");
  });

  it("returns blank input unchanged", () => {
    expect(filterEchoSentences("   ")).toBe("   ");
    expect(filterEchoSentences("")).toBe("");
  });

  it("drops a let us progress sentence and keeps unicode teaching", () => {
    const raw =
      "Let us work through this together. La photosynthèse convertit la lumière en énergie chimique.";

    expect(filterEchoSentences(raw)).toBe(
      "La photosynthèse convertit la lumière en énergie chimique.",
    );
  });

  it("strips a short sentence that contains a progress word anywhere", () => {
    const progressShaped =
      "The checking step in moderation analysis comes after you form the hypothesis.";
    expect(progressShaped.length).toBeLessThanOrEqual(160);

    expect(filterEchoSentences(progressShaped)).toBe("");
  });
});

describe("isEchoOnly (covers: AC-8 fallback)", () => {
  it("is true when every sentence is build chatter", () => {
    expect(isEchoOnly("Searching the web now.")).toBe(true);
    expect(isEchoOnly("I will look this up. Let me check.")).toBe(true);
  });

  it("is false when any teaching survives", () => {
    expect(
      isEchoOnly("Searching the web now. Photosynthesis converts light."),
    ).toBe(false);
  });

  it("is false for blank input", () => {
    expect(isEchoOnly("   ")).toBe(false);
  });
});
