import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const sqlDir = join(root, "scripts", "db-indexes");

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("database index scripts (covers: AC-10, AC-11)", () => {
  const sqlFiles = readdirSync(sqlDir)
    .filter((file) => file.startsWith("0008-slice") && file.endsWith(".sql"))
    .map((file) => join(sqlDir, file));

  it("creates every index concurrently outside the normal migrate path", () => {
    expect(sqlFiles.length).toBeGreaterThan(0);
    for (const file of sqlFiles) {
      const sql = read(file);
      const createLines = sql
        .split("\n")
        .filter((line) => line.trimStart().startsWith("CREATE INDEX"));
      expect(createLines.length).toBeGreaterThan(0);
      for (const line of createLines) {
        expect(line).toContain("CONCURRENTLY");
      }
    }
  });

  it("adds no paper or exam table or column", () => {
    for (const file of sqlFiles) {
      const sql = read(file).toLowerCase();
      expect(sql).not.toContain("mock_attempt");
      expect(sql).not.toContain("exam_source");
      expect(sql).not.toContain("exam_blueprint");
    }
  });

  it("records before and after plans beside the build log", () => {
    const plansDir = join(sqlDir, "plans");
    const expected = [
      "leaderboard-before.txt",
      "leaderboard-after.txt",
      "usage-quiz-before.txt",
      "usage-quiz-after.txt",
      "admin-before.txt",
      "admin-after.txt",
      "final-audit.txt",
    ];
    for (const file of expected) {
      expect(read(join(plansDir, file))).toBeTruthy();
    }
  });

  it("declares the composite indexes the rewrites read through", () => {
    const schema = read(join(root, "prisma", "schema.prisma"));
    const expected = [
      "@@index([role, createdAt])",
      "@@index([referredBy])",
      "@@index([userId, createdAt])",
      "@@index([noteId])",
      "@@index([userId, completedAt])",
      "@@index([conversationId, createdAt])",
      "@@index([userId, role, createdAt])",
      "@@index([status, createdAt])",
      "@@index([affiliateCode, converted])",
      "@@index([campaign, sentAt])",
      "@@index([metric, date])",
      "@@index([event, createdAt])",
    ];
    for (const index of expected) {
      expect(schema).toContain(index);
    }
  });
});
