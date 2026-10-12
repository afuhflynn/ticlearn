import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "check-prompts.mjs");
const PROBE_DIR = path.join(ROOT, "lib");

function runCheck(): { status: number; output: string } {
  try {
    const output = execFileSync("node", [SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output: String(output) };
  } catch (error) {
    const err = error as {
      status?: number;
      stdout?: unknown;
      stderr?: unknown;
    };
    return {
      status: err.status ?? 1,
      output: `${String(err.stdout ?? "")}\n${String(err.stderr ?? "")}`,
    };
  }
}

function withProbe(filename: string, content: string, fn: () => void): void {
  const file = path.join(PROBE_DIR, filename);
  fs.writeFileSync(file, content);
  try {
    fn();
  } finally {
    fs.rmSync(file, { force: true });
  }
}

const longBody = (word: string, times: number): string =>
  `${word} `.repeat(times).trim();

describe("scripts/check-prompts.mjs (covers: AC-1, spec enforcement)", () => {
  it("passes on the clean tree", () => {
    const result = runCheck();
    expect(result.status).toBe(0);
    expect(result.output).toContain("ok");
  });

  it("flags a long systemPrompt backtick literal", () => {
    withProbe(
      "check-probe-system-prompt.ts",
      `export const systemPrompt = \`${longBody("tutor", 60)}\`;\n`,
      () => {
        const result = runCheck();
        expect(result.status).toBe(1);
        expect(result.output).toContain("check-probe-system-prompt.ts");
        expect(result.output).toContain("systemPrompt");
      },
    );
  });

  it("flags a long double quoted instruction literal", () => {
    withProbe(
      "check-probe-instruction.ts",
      `const instruction = "${longBody("patiently", 60)}";\n`,
      () => {
        const result = runCheck();
        expect(result.status).toBe(1);
        expect(result.output).toContain("check-probe-instruction.ts");
      },
    );
  });

  it("passes a prompt shaped literal at exactly 200 chars", () => {
    withProbe(
      "check-probe-edge.ts",
      `export const systemPrompt = \`${"x".repeat(200)}\`;\n`,
      () => {
        expect(runCheck().status).toBe(0);
      },
    );
  });

  it("flags a prompt shaped literal at 201 chars", () => {
    withProbe(
      "check-probe-edge.ts",
      `export const systemPrompt = \`${"x".repeat(201)}\`;\n`,
      () => {
        const result = runCheck();
        expect(result.status).toBe(1);
        expect(result.output).toContain("check-probe-edge.ts");
      },
    );
  });

  it("keeps flagging the old exact const prompt shape", () => {
    withProbe("check-probe-legacy.ts", "const prompt = `tiny`;\n", () => {
      const result = runCheck();
      expect(result.status).toBe(1);
      expect(result.output).toContain("check-probe-legacy.ts");
    });
  });

  it("passes on the clean tree with provider imports confined", () => {
    const result = runCheck();
    expect(result.output).toContain(
      "provider imports flow through lib/ai/instances.ts",
    );
  });
});

describe("scripts/check-prompts.mjs provider import gate (covers: AC-8)", () => {
  it("flags a direct Gemini import that would bypass the chain", () => {
    withProbe(
      "check-probe-provider.ts",
      'import { google } from "@ai-sdk/google";\nexport const g = google("x");\n',
      () => {
        const result = runCheck();
        expect(result.status).toBe(1);
        expect(result.output).toContain("check-probe-provider.ts");
      },
    );
  });

  it("flags a direct OpenAI compatible import outside the one home", () => {
    withProbe(
      "check-probe-provider.ts",
      'import { createOpenAICompatible } from "@ai-sdk/openai-compatible";\nexport const p = createOpenAICompatible({ name: "x" });\n',
      () => {
        const result = runCheck();
        expect(result.status).toBe(1);
        expect(result.output).toContain("check-probe-provider.ts");
      },
    );
  });

  it("allows an unrelated package import with no provider name in it", () => {
    withProbe(
      "check-probe-clean.ts",
      'import { z } from "zod";\nexport const s = z.string();\n',
      () => {
        expect(runCheck().status).toBe(0);
      },
    );
  });
});
