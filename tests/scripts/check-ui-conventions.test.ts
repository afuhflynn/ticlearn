import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("check ui conventions", () => {
  it("baseline file exists and is keyed by rule", () => {
    const baselinePath = path.resolve(
      process.cwd(),
      "scripts/ui-conventions-baseline.json",
    );
    const raw = fs.readFileSync(baselinePath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty("palette-colour");
    expect(parsed).toHaveProperty("dark-colour-utility");
    expect(parsed).toHaveProperty("raw-aria");
    expect(parsed).toHaveProperty("hand-rolled-control");
  });
});
