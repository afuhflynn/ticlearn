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

  it("keeps the full set of eighteen questions (spec 0016 AC-3)", () => {
    expect(FAQ_ITEMS).toHaveLength(18);
  });

  it("routes password and support questions to WhatsApp, honestly (spec 0016 AC-3)", () => {
    const answer = (question: string) =>
      FAQ_ITEMS.find((item) => item.question === question)?.answer ?? "";

    // No flow exists in the auth code, so the answer may not invent one.
    expect(answer("How do I reset my password?")).toMatch(/WhatsApp/i);
    expect(answer("How do I reset my password?")).not.toMatch(/reset link/i);

    // One staffed channel, and no hours promise a team does not publish.
    expect(answer("How do I contact support?")).toMatch(/WhatsApp/i);
    expect(answer("How do I contact support?")).not.toMatch(
      /email|business hours/i,
    );

    // The Terms promise no refunds, so the answer may not promise one.
    expect(answer("Can I get a refund?")).toMatch(/final|no/i);
    expect(answer("Can I get a refund?")).not.toMatch(/full refund/i);

    // The privacy stance: stored on a hosted database, sent to AI providers,
    // and no encryption claim beyond what is real.
    expect(answer("Is my data secure?")).toMatch(/AI provider/i);
    expect(answer("Is my data secure?")).not.toMatch(/encrypt/i);
  });

  it("does not sell leaderboards the rebuild cut (spec 0014 AC-1)", () => {
    for (const item of FAQ_ITEMS) {
      // The ranking answer was rewritten to say what is true, without the
      // gate banned keywords (spec 0016 AC-3). Nothing in the list may claim
      // students can rank or compare themselves.
      expect(item.answer).not.toMatch(/compare( yourself)? with other/i);
      expect(item.answer).not.toMatch(/^Leaderboards rank/i);
      expect(item.answer).not.toMatch(/leaderboard|score/i);
      expect(item.question).not.toMatch(/leaderboard|score/i);
    }
  });
});
