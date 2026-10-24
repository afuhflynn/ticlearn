/**
 * The FAQ list behind the `/faq` page (spec 0012, AC-9).
 *
 * The page metadata promises answers about cost, data use and offline
 * access, so the list has to actually carry those answers. The spec names
 * `FAQ_ITEMS` in `constants/index.ts` as the source of the answers, which is
 * what this file holds it to.
 */
import { describe, expect, it } from "vitest";
import { FAQ_ITEMS } from "@/constants";

describe("the FAQ list (spec 0012 AC-9)", () => {
  it("gives every question and every answer some text", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.question.length).toBeGreaterThan(0);
      expect(item.answer.length).toBeGreaterThan(0);
    }
  });

  it("keeps the questions unique", () => {
    const questions = FAQ_ITEMS.map((item) => item.question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("answers what the page description promises about cost", () => {
    expect(
      FAQ_ITEMS.some((item) => /free|cost|price|pay/i.test(item.question)),
    ).toBe(true);
  });

  it("answers what the page description promises about data use", () => {
    expect(FAQ_ITEMS.some((item) => /data/i.test(item.question))).toBe(true);
  });

  it("answers what the page description promises about offline access", () => {
    expect(FAQ_ITEMS.some((item) => /offline/i.test(item.question))).toBe(true);
  });

  it("does not sell leaderboards the rebuild cut (spec 0014 AC-1)", () => {
    for (const item of FAQ_ITEMS) {
      // The leaderboard answer was rewritten to say what is true. Nothing in
      // the list may claim students can rank or compare themselves.
      expect(item.answer).not.toMatch(/compare( yourself)? with other/i);
      expect(item.answer).not.toMatch(/^Leaderboards rank/i);
    }
  });
});
