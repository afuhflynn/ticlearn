import { describe, expect, it } from "vitest";
import { normalizeMathNotation } from "@/lib/math-format";

describe("normalizeMathNotation", () => {
  it("leaves plain prose alone", () => {
    expect(normalizeMathNotation("Hello, let's study today.")).toBe(
      "Hello, let's study today.",
    );
  });

  it("leaves bare ASCII math alone, so the prompt contract is load bearing", () => {
    // No renderer can tell `P(n,r) = n! / (n-r)!` is math. The model must
    // emit delimiters; this test pins why the chat and quiz prompts demand
    // `$...$` instead of hoping the normalizer guesses.
    const bare = "P(n,r) = n! / (n-r)! for ordered counts.";
    expect(normalizeMathNotation(bare)).toBe(bare);
  });

  it("converts single dollar inline math to display delimiters", () => {
    expect(normalizeMathNotation("Mean $E[X] = \\sum x p(x)$ ok")).toBe(
      "Mean $$ E[X] = \\sum x p(x) $$ ok",
    );
  });

  it("converts \\[ ... \\] display math", () => {
    expect(normalizeMathNotation("Result \\[x^2 + y^2\\] done")).toContain(
      "$$",
    );
    expect(normalizeMathNotation("Result \\[x^2 + y^2\\] done")).toContain(
      "x^2 + y^2",
    );
  });

  it("converts \\( ... \\) inline math", () => {
    expect(normalizeMathNotation("Value \\(\\lambda = 3\\) here")).toContain(
      "$$ \\lambda = 3 $$",
    );
  });

  it("converts ```math fenced blocks", () => {
    const out = normalizeMathNotation("```math\n\\frac{a}{b}\n```");
    expect(out).toContain("$$");
    expect(out).toContain("\\frac{a}{b}");
  });

  it("does not treat prices as math", () => {
    expect(normalizeMathNotation("It costs $5 and $10 total")).toBe(
      "It costs $5 and $10 total",
    );
    expect(normalizeMathNotation("The pass is $5")).toBe("The pass is $5");
  });

  it("still converts digit-led real math", () => {
    expect(normalizeMathNotation("Sum $5 + 3 = 8$ done")).toBe(
      "Sum $$ 5 + 3 = 8 $$ done",
    );
  });
});
