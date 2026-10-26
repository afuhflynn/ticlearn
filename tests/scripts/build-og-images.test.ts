import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The share card generator, from spec 0021 AC-3 and AC-8.
 *
 * The cards live outside the honesty gate, because the gate strips scripts and
 * reads text from the served HTML and an image has no text to read. That makes
 * the copy baked into `scripts/build-og-images.mjs` the one public surface
 * nothing else checks, so the rules are applied to it here.
 *
 * The generator is read as source rather than imported, because importing it
 * writes the images. The shipped files are checked where they are read.
 */
const ROOT = process.cwd();
const source = fs.readFileSync(
  path.join(ROOT, "scripts", "build-og-images.mjs"),
  "utf8",
);

function matches(pattern: RegExp): string[] {
  return Array.from(source.matchAll(pattern), (match) => match[1]);
}

const cardFiles = matches(/file: "([^"]+)"/g);
const captures = matches(/capture: "([^"]+)"/g);
const titles = matches(/title: \[([^\]]+)\]/g).map((list) => list.trim());
const lines = matches(/lines: \[([^\]]+)\]/g).map((list) => list.trim());
const copy = [...titles, ...lines].join(" ").replace(/",\s*"/g, " ");

describe("the card set matches the pages that use it (AC-3)", () => {
  it("builds one card per page the metadata names", () => {
    expect([...cardFiles].sort()).toEqual(
      ["about.png", "default.png", "faq.png", "home.png"].sort(),
    );
  });

  it("draws every card from a capture that exists in the repo", () => {
    expect(captures).toHaveLength(cardFiles.length);

    for (const capture of captures) {
      const file = path.join(ROOT, "public", "marketing", capture);
      expect(fs.existsSync(file), `missing capture ${capture}`).toBe(true);
    }
  });

  it("has already shipped each card it names", () => {
    for (const card of cardFiles) {
      const file = path.join(ROOT, "public", "og", card);
      expect(fs.existsSync(file), `missing card ${card}`).toBe(true);
    }
  });

  it("publishes no card the pages do not ask for", () => {
    const shipped = fs.readdirSync(path.join(ROOT, "public", "og"));

    expect(shipped.sort()).toEqual([...cardFiles].sort());
  });
});

describe("the card copy follows the honesty rules (AC-8)", () => {
  it("states no amount of money", () => {
    expect(copy).not.toMatch(
      /(?:₣|\$|€|£|¥|(?:\b\d[\d\s.,]*\s*(?:FCFA|XAF|CFA|USD|EUR)\b))/i,
    );
  });

  it("states no bare percentage", () => {
    expect(copy).not.toMatch(/\d+(?:[.,]\d+)?\s*%/);
  });

  it("states no phone number and no email address", () => {
    expect(copy).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
    expect(copy).not.toMatch(/@/);
  });

  it("names no surface the product cut", () => {
    for (const word of [
      "community",
      "leaderboard",
      "affiliate",
      "readiness",
      "exam",
      "mock",
      "gce",
      "a level",
      "paper 1",
      "paper 2",
      "paper 3",
      "score",
      "streak",
    ]) {
      expect(copy.toLowerCase(), `card copy mentions ${word}`).not.toMatch(
        new RegExp(`\\b${word}\\b`),
      );
    }
  });
});
