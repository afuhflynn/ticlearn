import { describe, expect, it } from "vitest";
import { SUGGESTION_MAX_CHARS, sanitizeSuggestions } from "@/lib/ai/validators";

describe("sanitizeSuggestions (covers: AC-24)", () => {
  it("keeps two or three short questions in the order the model sent them", () => {
    expect(
      sanitizeSuggestions([
        "Explain the chain rule with an example",
        "What is a derivative?",
        "Show me one past paper question",
        "And a fourth one",
      ]),
    ).toEqual([
      "Explain the chain rule with an example",
      "What is a derivative?",
      "Show me one past paper question",
    ]);
  });

  it("returns nothing when fewer than two survive", () => {
    expect(sanitizeSuggestions([])).toEqual([]);
    expect(sanitizeSuggestions(["Explain the chain rule"])).toEqual([]);
    expect(
      sanitizeSuggestions(["Explain the chain rule", "x".repeat(200)]),
    ).toEqual([]);
  });

  it("drops a question longer than one line on a phone", () => {
    const long = `Explain ${"the chain rule ".repeat(6)}`;
    expect(long.length).toBeGreaterThan(SUGGESTION_MAX_CHARS);

    expect(sanitizeSuggestions([long, "What is a derivative?"])).toEqual([]);
  });

  it("keeps only the words of a link and strips markdown", () => {
    expect(
      sanitizeSuggestions([
        "**Explain** [the chain rule](https://example.com/x) again",
        "`What is a derivative?`",
      ]),
    ).toEqual(["Explain the chain rule again", "What is a derivative?"]);
  });

  it("drops duplicates regardless of case", () => {
    expect(
      sanitizeSuggestions([
        "Explain the chain rule",
        "explain the chain rule",
        "What is a derivative?",
      ]),
    ).toEqual(["Explain the chain rule", "What is a derivative?"]);
  });

  it("ignores an entry that is not a string", () => {
    expect(
      sanitizeSuggestions([
        "Explain the chain rule",
        // biome-ignore lint/suspicious/noExplicitAny: the model can send anything.
        null as any,
        "What is a derivative?",
      ]),
    ).toEqual(["Explain the chain rule", "What is a derivative?"]);
  });
});
