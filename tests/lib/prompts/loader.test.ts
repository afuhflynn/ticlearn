import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPromptCache,
  FALLBACK_TEXT,
  getPrompt,
  getPromptOrFallback,
  getPromptSync,
  getToolDescription,
  loadPromptRaw,
  PromptError,
  promptCallFields,
  renderPrompt,
} from "@/lib/prompts/loader";

const AREA = "quiz";

function writePrompt(dir: string, body: string, header: string): void {
  const areaDir = path.join(dir, AREA);
  fs.mkdirSync(areaDir, { recursive: true });
  fs.writeFileSync(path.join(areaDir, "study_brief.md"), `${header}\n${body}`);
}

const header = `---
name: study_brief
model: gemini-2.5-flash
version: 2
heat: 0.4
cap: 2048
cacheSpanMs: 2592000000
needsTools: false
needsImages: false
slots:
  - excerpt
---`;

describe("prompt loader", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-"));
    process.env.PROMPTS_DIR = dir;
    clearPromptCache();
  });

  afterEach(() => {
    delete process.env.PROMPTS_DIR;
    clearPromptCache();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("renders declared slots", async () => {
    writePrompt(dir, "Notes:\n{{excerpt}}\n", header);
    const loaded = await getPrompt(AREA, "study_brief", { excerpt: "hello" });
    expect(loaded.text).toContain("hello");
    expect(loaded.settings.version).toBe(2);
    expect(loaded.settings.model).toBe("gemini-2.5-flash");
  });

  it("throws on a missing slot value", () => {
    expect(() =>
      renderPrompt("study_brief", "Notes:\n{{excerpt}}\n", ["excerpt"], {}),
    ).toThrow(PromptError);
  });

  it("throws on a model outside the allow list", () => {
    writePrompt(
      dir,
      "Body\n",
      header.replace("gemini-2.5-flash", "other-model"),
    );
    expect(() => getPromptSync(AREA, "study_brief")).toThrow(PromptError);
  });

  it("throws on a missing file", () => {
    expect(() => getPromptSync(AREA, "study_brief")).toThrow(PromptError);
  });

  it("rereads after the file changes", () => {
    writePrompt(dir, "First {{excerpt}}\n", header);
    const first = getPromptSync(AREA, "study_brief", { excerpt: "a" });
    expect(first.text).toContain("First");

    const file = path.join(dir, AREA, "study_brief.md");
    const later = new Date(Date.now() + 2000);
    fs.writeFileSync(file, `${header}\nSecond {{excerpt}}\n`);
    fs.utimesSync(file, later, later);

    const second = getPromptSync(AREA, "study_brief", { excerpt: "a" });
    expect(second.text).toContain("Second");
  });

  it("keeps a static fallback with no student data", () => {
    expect(FALLBACK_TEXT).not.toContain("{{");
    expect(FALLBACK_TEXT.length).toBeGreaterThan(0);
  });
});

describe("prompt registry files", () => {
  it("loads every shipped prompt file", async () => {
    const { loadPromptRaw } = await import("@/lib/prompts/loader");
    const root = path.join(process.cwd(), "prompts");
    const areas = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(areas.length).toBeGreaterThan(0);
    let count = 0;
    for (const area of areas) {
      const files = fs
        .readdirSync(path.join(root, area))
        .filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const name = file.replace(/\.md$/, "");
        const loaded = loadPromptRaw(area, name);
        expect(loaded.settings.name).toBe(name);
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});

const needsToolsHeader = `---
name: study_brief
model: gemini-2.5-flash
version: 1
needsTools: true
slots:
  - excerpt
---`;

const needsImagesHeader = `---
name: study_brief
model: gemini-2.5-flash
version: 1
needsImages: true
slots: []
---`;

describe("prompt loader needs flags (covers: spec standard needs enforcement)", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-needs-"));
    process.env.PROMPTS_DIR = dir;
    clearPromptCache();
  });

  afterEach(() => {
    delete process.env.PROMPTS_DIR;
    clearPromptCache();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("throws naming the prompt when tools are needed but absent", () => {
    writePrompt(dir, "Notes:\n{{excerpt}}\n", needsToolsHeader);
    expect(() => getPromptSync(AREA, "study_brief", { excerpt: "x" })).toThrow(
      /\[prompts\/study_brief\] needs tools/,
    );
  });

  it("loads when the caller offers tools", () => {
    writePrompt(dir, "Notes:\n{{excerpt}}\n", needsToolsHeader);
    const loaded = getPromptSync(
      AREA,
      "study_brief",
      { excerpt: "x" },
      { tools: true },
    );
    expect(loaded.text).toContain("x");
  });

  it("throws naming the prompt when images are needed but absent", async () => {
    writePrompt(dir, "Body\n", needsImagesHeader);
    await expect(getPrompt(AREA, "study_brief")).rejects.toThrow(
      /\[prompts\/study_brief\] needs images/,
    );
  });

  it("loads every shipped tool description from the same home (covers: AC-4)", () => {
    clearPromptCache();
    delete process.env.PROMPTS_DIR;
    const toolsDir = path.join(process.cwd(), "prompts", "tools");
    const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = getToolDescription(file.replace(/\.md$/, ""));
      expect(text.length).toBeGreaterThan(0);
    }
    clearPromptCache();
  });
});

describe("prompt loader fallback (covers: spec standard fallback path)", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-fb-"));
    process.env.PROMPTS_DIR = dir;
    clearPromptCache();
  });

  afterEach(() => {
    delete process.env.PROMPTS_DIR;
    clearPromptCache();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns the static fallback without throwing and without slot values", async () => {
    writePrompt(
      dir,
      "Body\n",
      header.replace("gemini-2.5-flash", "other-model"),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = await getPromptOrFallback(AREA, "study_brief", {
      excerpt: "STUDENTDATA123",
    });
    expect(text).toBe(FALLBACK_TEXT);
    expect(text).not.toContain("STUDENTDATA123");
    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("study_brief");
    expect(logged).not.toContain("STUDENTDATA123");
    warnSpy.mockRestore();
  });

  it("returns rendered text on the happy path", async () => {
    writePrompt(dir, "Notes:\n{{excerpt}}\n", header);
    const text = await getPromptOrFallback(AREA, "study_brief", {
      excerpt: "hello",
    });
    expect(text).toContain("hello");
  });
});

describe("prompt call fields (covers: spec standard file settings travel)", () => {
  it("maps heat plus cap plus span plus ref exactly", () => {
    const loaded = loadPromptRawShipped("quiz", "study_brief");
    const fields = promptCallFields(loaded.settings);
    expect(fields.modelOptions).toEqual({
      temperature: loaded.settings.heat,
      maxOutputTokens: loaded.settings.cap,
    });
    expect(fields.cacheTtlMs).toBe(loaded.settings.cacheSpanMs);
    expect(fields.promptRef).toEqual({
      name: "study_brief",
      version: loaded.settings.version,
      model: "gemini-2.5-flash",
    });
  });

  it("gives grading prompts a zero span so marking never caches", () => {
    const grading: Array<[string, string]> = [
      ["grade", "grade_open_answer"],
      ["grade", "explain_mcq_answer"],
      ["paper3", "grade_short_answer"],
      ["paper3", "grade_short_answer_system"],
    ];
    for (const [area, name] of grading) {
      const loaded = loadPromptRawShipped(area, name);
      expect(promptCallFields(loaded.settings).cacheTtlMs).toBe(0);
    }
  });
});

function loadPromptRawShipped(area: string, name: string) {
  const saved = process.env.PROMPTS_DIR;
  delete process.env.PROMPTS_DIR;
  clearPromptCache();
  try {
    return loadPromptRaw(area, name);
  } finally {
    if (saved !== undefined) process.env.PROMPTS_DIR = saved;
    clearPromptCache();
  }
}

describe("shipped prompt file invariants (covers: AC-2)", () => {
  it("keeps heat plus cap plus span plus flags inside the header contract", () => {
    const root = path.join(process.cwd(), "prompts");
    const areas = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    let count = 0;
    for (const area of areas) {
      const files = fs
        .readdirSync(path.join(root, area))
        .filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const name = file.replace(/\.md$/, "");
        const loaded = loadPromptRawShipped(area, name);
        const s = loaded.settings;
        expect(s.heat).toBeGreaterThanOrEqual(0);
        expect(s.heat).toBeLessThanOrEqual(1);
        expect(Number.isInteger(s.cap)).toBe(true);
        expect(s.cap).toBeGreaterThan(0);
        expect(Number.isInteger(s.cacheSpanMs)).toBe(true);
        expect(s.cacheSpanMs).toBeGreaterThanOrEqual(0);
        expect(typeof s.needsTools).toBe("boolean");
        expect(typeof s.needsImages).toBe("boolean");
        const used = new Set(
          [...loaded.text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]),
        );
        for (const slot of used) {
          expect(s.slots).toContain(slot);
        }
        count += 1;
      }
    }
    expect(count).toBeGreaterThan(0);
  });
});
