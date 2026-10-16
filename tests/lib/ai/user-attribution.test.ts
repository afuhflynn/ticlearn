import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * AC-4 regressed once already: the ledger accepted a user id but no helper
 * accepted one, so every usage row was anonymous and per student cost read
 * empty. These cases pin the wiring so a future helper cannot repeat it.
 */

type HelperCall = {
  file: string;
  helper: string;
  hasUserIdParam: boolean;
  forwardsUserId: boolean;
};

function listSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(full, out);
    else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name))
      out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(ROOT, file);
}

/** Every exported async function that ends up calling the orchestrator. */
function helperCalls(): HelperCall[] {
  const files = [
    ...listSourceFiles(path.join(ROOT, "lib", "ai")),
    ...listSourceFiles(path.join(ROOT, "lib", "paper3")),
    path.join(ROOT, "lib", "mock-generator.ts"),
  ].filter(
    (file) => path.basename(file) !== "orchestrator.ts" && fs.existsSync(file),
  );
  const found: HelperCall[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (!/\bgenerate(Critical|TextCritical|TextWithFallback)?\(/.test(text)) {
      continue;
    }
    const decl =
      /export\s+async\s+function\s+(\w+)\s*\(([\s\S]*?)\)\s*(?::|\{)/g;
    for (let match = decl.exec(text); match !== null; match = decl.exec(text)) {
      const [, name, params] = match;
      const hasUserIdParam = /userId\??\s*:\s*string/.test(params);
      const body = text.slice(match.index, match.index + 3000);
      const forwardsUserId =
        /userId:/.test(body) || /\buserId\b\s*,/.test(body);
      if (hasUserIdParam || forwardsUserId) {
        found.push({
          file: rel(file),
          helper: name,
          hasUserIdParam,
          forwardsUserId,
        });
      }
    }
  }
  return found;
}

describe("student attribution wiring (covers: AC-4)", () => {
  const calls = helperCalls();

  it("finds the AI helpers that feed the ledger", () => {
    expect(calls.length).toBeGreaterThan(0);
  });

  it("every helper that forwards a student also accepts one as a parameter", () => {
    const offenders = calls
      .filter((c) => c.forwardsUserId && !c.hasUserIdParam)
      .map((c) => `${c.file}:${c.helper}`);
    expect(offenders).toEqual([]);
  });

  it("lib/ai/index.ts accepts a student on its grading helper", () => {
    const text = fs.readFileSync(
      path.join(ROOT, "lib", "ai", "index.ts"),
      "utf8",
    );
    expect(text).toMatch(
      /export\s+async\s+function\s+gradeOpenAnswer\([\s\S]*?userId\??\s*:\s*string/,
    );
  });

  it("lib/ai/index.ts accepts a student on its quiz generation helper", () => {
    const text = fs.readFileSync(
      path.join(ROOT, "lib", "ai", "index.ts"),
      "utf8",
    );
    expect(text).toMatch(
      /export\s+async\s+function\s+generateQuizFromNote\([\s\S]*?userId\??\s*:\s*string/,
    );
  });

  it("the quiz generate route passes the signed in student through", () => {
    const text = fs.readFileSync(
      path.join(ROOT, "app", "api", "quizzes", "generate", "route.ts"),
      "utf8",
    );
    expect(text).toMatch(/inngest\.send\([\s\S]*?userId:\s*session\.user\.id/);
  });

  it("the quiz attempt route passes the signed in student through", () => {
    const text = fs.readFileSync(
      path.join(ROOT, "app", "api", "quizzes", "attempts", "route.ts"),
      "utf8",
    );
    expect(text).toMatch(/gradeOpenAnswer\([\s\S]*?session\.user\.id/);
  });

  it("the note processing job passes the note owner through", () => {
    const text = fs.readFileSync(
      path.join(ROOT, "lib", "inngest", "functions.ts"),
      "utf8",
    );
    expect(text).toMatch(/summarizeText\([^)]*note\.userId/);
  });
});
