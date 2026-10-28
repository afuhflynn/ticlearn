import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CHAT_SYSTEM = path.join(ROOT, "prompts", "chat", "chat_system.md");

function body(): string {
  return fs.readFileSync(CHAT_SYSTEM, "utf8");
}

describe("chat_system prompt contract", () => {
  it("declares no student-level slot and forbids class-year adaptation", () => {
    const text = body();
    expect(text).not.toContain("studentLevel");
    expect(text).not.toContain("{{studentLevel}}");
    expect(text).toMatch(/never mention.*year of study/i);
  });

  it("teaches the model the formatting rules phones need", () => {
    const text = body();
    expect(text).toContain("HOW YOU FORMAT");
    expect(text).toMatch(/blank line/i);
    expect(text).toMatch(/numbered|list/i);
    expect(text).toMatch(/\$\.\.\.\$/);
  });

  it("requires delimited math and forbids bare duplicates", () => {
    const text = body();
    expect(text).toContain("MATH YOU RENDER");
    expect(text).toMatch(/never emit bare/i);
  });

  it("rations emoji instead of banning it", () => {
    const text = body();
    expect(text.toLowerCase()).not.toContain("avoid emoji");
    expect(text).toMatch(/sparingly|ration/i);
  });
});
