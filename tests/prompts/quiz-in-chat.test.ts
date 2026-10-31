import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPromptRaw } from "@/lib/prompts/loader";

const ROOT = process.cwd();

function readPrompt(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

describe("in chat quiz script (spec 0031, covers: AC-1)", () => {
  it("bumps the chat prompt and names the runner trigger", () => {
    const { settings, text } = loadPromptRaw("chat", "chat_system");

    expect(settings.version).toBe(16);
    expect(text).toContain("IN CHAT QUIZ");
    expect(text).toContain("startQuiz");
  });

  it("tells the model the runner owns questions, never the prose", () => {
    const text = readPrompt("prompts/chat/chat_system.md");

    expect(text).toMatch(/never write your own questions/i);
    expect(text).toMatch(/wizard owns.*setup/i);
  });

  it("sends in thread practice to the runner and page practice to createQuiz", () => {
    const text = readPrompt("prompts/chat/chat_system.md");

    expect(text).toMatch(/in chat quiz runner/i);
    expect(text).toMatch(/createQuiz builds quizzes for the quiz page/i);
  });

  it("loads the startQuiz tool prompt through the loader", () => {
    const { settings, text } = loadPromptRaw("tools", "start_quiz");

    expect(settings.name).toBe("start_quiz");
    expect(text.toLowerCase()).toContain("runner");
  });
});
