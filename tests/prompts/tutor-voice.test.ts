import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPromptRaw } from "@/lib/prompts/loader";

const ROOT = process.cwd();

function readFile(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function bannedOpeners(): string[] {
  const text = readFile("prompts/chat/voice_examples.md");
  const section = text.split("## Banned openers")[1]?.split("## ")[0] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().toLowerCase())
    .filter(Boolean);
}

function countOccurrences(haystack: string, needle: string): number {
  const lowHay = haystack.toLowerCase();
  const lowNeedle = needle.toLowerCase();
  let count = 0;
  let index = 0;
  while (true) {
    const found = lowHay.indexOf(lowNeedle, index);
    if (found === -1) return count;
    count += 1;
    index = found + lowNeedle.length;
  }
}

function containsBannedOpener(text: string, banned: string[]): string[] {
  const low = text.toLowerCase();
  return banned.filter((phrase) => low.includes(phrase));
}

function extractQuotes(text: string): string[] {
  const matches =
    text.match(/["\u201C]([^"\u201C\u201D]{12,})["\u201D]/g) ?? [];
  return matches.map((m) => m.toLowerCase());
}

function duplicateQuotes(text: string): string[] {
  const quotes = extractQuotes(text);
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const quote of quotes) {
    if (seen.has(quote)) dupes.add(quote);
    seen.add(quote);
  }
  return [...dupes];
}

function pageTags(text: string): string[] {
  return text.match(/\(p\.? \d+\)/g) ?? [];
}

const GOOD_SIX_TURN = [
  "We will walk through mitosis using your Biology Week 4 note (p 2). Prophase packs the chromatin into visible chromosomes.",
  "In metaphase the chromosomes line up at the plate (p 2). Spindle fibres attach at the kinetochore.",
  "Anaphase splits the sister chromatids to opposite poles (p 3), so each side holds one copy.",
  "Telophase rebuilds the nuclear envelope around each set. No tag needed here, the step follows from the last one.",
  "Cytokinesis divides the cytoplasm. Want to try one quick check on which stage pulls chromatids apart?",
  "Correct, anaphase does the pulling. The key to remember is poles apart in anaphase.",
].join("\n\n");

const BAD_REPEATING_THREAD = [
  "From your notes, mitosis has four stages. Quote: \u201cMitosis is cell division with four stages.\u201d",
  "From your notes, prophase packs chromatin. Quote: \u201cMitosis is cell division with four stages.\u201d",
  "Based on your notes, metaphase lines up chromosomes.",
  "According to your notes, anaphase splits chromatids.",
  "As your notes say, telophase rebuilds the envelope.",
  "In your notes, cytokinesis divides the cell.",
].join("\n\n");

describe("tutor voice and citation habit", () => {
  it("bumps the chat prompt to version 15 with the shared habit block", () => {
    const { settings, text } = loadPromptRaw("chat", "chat_system");
    expect(settings.version).toBe(15);
    expect(text).toContain("VOICE AND PROOF HABIT");
    expect(text).toMatch(/at most once per topic/i);
    expect(text).toContain("(p 3)");
    expect(text).toMatch(/never the same quote twice/i);
  });

  it("drops the old quote first and check first rules", () => {
    const text = readFile("prompts/chat/chat_system.md");
    expect(text).not.toMatch(/Quote before you explain/);
    expect(text).not.toMatch(/Say which note and which part/);
    expect(text).not.toMatch(
      /Ask one checking question before the full answer/,
    );
  });

  it("asks the checking question only for vague or handover asks", () => {
    const text = readFile("prompts/chat/chat_system.md");
    expect(text).toMatch(/only when the ask is vague/i);
    expect(text).toMatch(/hand over a finished answer/i);
    expect(text).toMatch(/teach first/i);
  });

  it("reads once per topic and rereads only on a shift", () => {
    const text = readFile("prompts/chat/chat_system.md");
    expect(text).toMatch(/once per topic/i);
    expect(text).toMatch(/different chapter, note section, or past question/i);
  });

  it("keeps the landing hello rule", () => {
    const text = readFile("prompts/chat/chat_system.md");
    expect(text).toMatch(/landing already greeted/i);
    expect(text).toMatch(/at most one short intro/i);
  });

  it("pivots in plain words on thin evidence with no invented proof", () => {
    const text = readFile("prompts/chat/chat_system.md");
    expect(text).toMatch(/say what is missing in plain words/i);
    expect(text).toMatch(/offer practice with startQuiz/i);
    expect(text).toMatch(/Never invent a page number/i);
  });

  it("keeps the banned opener list exact and out of the required rules", () => {
    const banned = bannedOpeners();
    expect(banned.length).toBeGreaterThan(5);
    expect(banned).toContain("from your notes");
    const chat = readFile("prompts/chat/chat_system.md").toLowerCase();
    for (const phrase of banned) {
      expect(chat).not.toMatch(
        new RegExp(`(always|must|every turn).{0,80}${phrase}`),
      );
    }
  });

  it("passes a clean six turn sample: one naming, no banned opener, no duplicate quote", () => {
    const banned = bannedOpeners();
    expect(countOccurrences(GOOD_SIX_TURN, "Biology Week 4 note")).toBe(1);
    expect(containsBannedOpener(GOOD_SIX_TURN, banned)).toEqual([]);
    expect(duplicateQuotes(GOOD_SIX_TURN)).toEqual([]);
    expect(pageTags(GOOD_SIX_TURN).length).toBeGreaterThan(0);
  });

  it("flags a repeating thread: many namings, banned openers, duplicate quote", () => {
    const banned = bannedOpeners();
    const namings =
      countOccurrences(BAD_REPEATING_THREAD, "your notes") +
      countOccurrences(BAD_REPEATING_THREAD, "notes,");
    expect(namings).toBeGreaterThan(1);
    expect(
      containsBannedOpener(BAD_REPEATING_THREAD, banned).length,
    ).toBeGreaterThan(0);
    expect(duplicateQuotes(BAD_REPEATING_THREAD).length).toBeGreaterThan(0);
  });

  it("gives quiz correction the same voice with no preamble", () => {
    for (const relative of [
      "prompts/grade/grade_open_answer.md",
      "prompts/grade/explain_mcq_answer.md",
      "prompts/retry/explain_and_retry.md",
    ]) {
      const text = readFile(relative);
      expect(text).toMatch(/VOICE AND PROOF/i);
      expect(text).toMatch(/chat_system\.md/);
      expect(text).toMatch(/no opener about notes/i);
      expect(text).toMatch(/\(p 3\)/);
      expect(text).toMatch(/never the same quote twice/i);
    }
  });

  it("keeps the thin evidence pivot in correction prompts", () => {
    expect(readFile("prompts/grade/grade_open_answer.md")).toMatch(
      /say what is\s+missing in plain words/i,
    );
    expect(readFile("prompts/retry/explain_and_retry.md")).toMatch(
      /say what is missing in plain words/i,
    );
    expect(readFile("prompts/retry/explain_and_retry.md")).toMatch(
      /show no tag and no quote/i,
    );
  });

  it("loads every touched prompt through the prompt loader", () => {
    expect(loadPromptRaw("chat", "chat_system").settings.name).toBe(
      "chat_system",
    );
    expect(loadPromptRaw("grade", "grade_open_answer").settings.name).toBe(
      "grade_open_answer",
    );
    expect(loadPromptRaw("grade", "explain_mcq_answer").settings.name).toBe(
      "explain_mcq_answer",
    );
    expect(loadPromptRaw("retry", "explain_and_retry").settings.name).toBe(
      "explain_and_retry",
    );
  });
});
