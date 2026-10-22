import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd());

describe("check ui conventions", () => {
  it("baseline file exists and is keyed by rule", () => {
    const baselinePath = path.resolve(
      ROOT,
      "scripts/ui-conventions-baseline.json",
    );
    const raw = fs.readFileSync(baselinePath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty("palette-colour");
    expect(parsed).toHaveProperty("dark-colour-utility");
    expect(parsed).toHaveProperty("raw-aria");
    expect(parsed).toHaveProperty("hand-rolled-control");
  });

  it("the loading allowlist exists and every entry has a reason", () => {
    const allowlistPath = path.resolve(ROOT, "scripts/loading-allowlist.json");
    const raw = fs.readFileSync(allowlistPath, "utf8");
    const parsed = JSON.parse(raw);
    for (const [file, reason] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (file.startsWith("_")) continue;
      expect(typeof reason).toBe("string");
      expect((reason as string).length).toBeGreaterThan(0);
    }
  });

  it("the spinner rule fails, so a new spinner is caught", () => {
    const source = fs.readFileSync(
      path.resolve(ROOT, "scripts/check-ui-conventions.mjs"),
      "utf8",
    );
    expect(source).toContain('const SPINNER_RULE_MODE = "fail"');
  });

  it("no screen outside the primitive folders draws a spinner", () => {
    const spinnerFiles = listFiles(path.resolve(ROOT, "app")).concat(
      listFiles(path.resolve(ROOT, "components")),
    );
    const primitives = ["components/ui/", "components/ai-elements/"];
    const offenders = spinnerFiles.filter((rel) => {
      if (primitives.some((p) => rel.startsWith(p))) return false;
      const src = fs.readFileSync(path.resolve(ROOT, rel), "utf8");
      return /<Loader2?\b/.test(src) && !/<Button\b/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});

function listFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else if (/\.tsx?$/.test(entry.name))
      out.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }
  return out;
}
