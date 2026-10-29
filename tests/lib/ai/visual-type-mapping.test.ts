import { describe, expect, it } from "vitest";
import { toVisualTypeEnum } from "@/lib/ai/page-scan";

/**
 * Baseten answers in lowercase while the Prisma enum is uppercase. The cast
 * alone passed the lowercase value to the database and failed, so this
 * mapping runs first (review finding on spec 0027).
 */
describe("toVisualTypeEnum", () => {
  it("maps each lowercase Baseten value to its Prisma enum value", () => {
    expect(toVisualTypeEnum("diagram")).toBe("DIAGRAM");
    expect(toVisualTypeEnum("chart")).toBe("CHART");
    expect(toVisualTypeEnum("table")).toBe("TABLE");
    expect(toVisualTypeEnum("illustration")).toBe("ILLUSTRATION");
    expect(toVisualTypeEnum("other")).toBe("OTHER");
  });

  it("falls back to OTHER for anything unexpected", () => {
    expect(toVisualTypeEnum("photograph")).toBe("OTHER");
    expect(toVisualTypeEnum("")).toBe("OTHER");
  });
});
