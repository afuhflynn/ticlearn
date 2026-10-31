import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChatTools } from "@/lib/ai/tools";
import { getToolDescription } from "@/lib/prompts/loader";
import { prisma } from "@/lib/prisma";

type Execute = (args: unknown, options: unknown) => Promise<unknown>;

function tool() {
  const tools = createChatTools({
    userId: "user-1",
    conversationId: "conv-1",
  });
  return tools.startQuiz.execute as unknown as Execute;
}

type MockFn = (...args: never[]) => Promise<unknown>;

function dbMock(
  model: string,
  method: string,
): {
  mockResolvedValue: (v: unknown) => void;
} {
  const db = prisma as unknown as Record<string, Record<string, MockFn>>;
  db[model] ??= {};
  db[model][method] ??= vi.fn();
  return db[model][method] as unknown as {
    mockResolvedValue: (v: unknown) => void;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock("chatConversation", "findFirst").mockResolvedValue({
    noteId: "note-1",
  });
  dbMock("note", "findFirst").mockResolvedValue({
    id: "note-1",
    title: "Morphemes",
  });
});

describe("startQuiz tool surface (spec 0031, covers: AC-1)", () => {
  it("registers on the chat surface beside the quiz page tool", () => {
    const tools = createChatTools({ userId: "user-1" });

    expect(tools).toHaveProperty("startQuiz");
    expect(tools).toHaveProperty("createQuiz");
  });

  it("takes only a note id and title, so the runner owns count and flow", () => {
    const tools = createChatTools({ userId: "user-1" });
    const schema = tools.startQuiz.inputSchema as unknown as {
      shape: Record<string, unknown>;
    };

    expect(Object.keys(schema.shape).sort()).toEqual(["noteId", "noteTitle"]);
  });

  it("loads a prompt that names the runner and forbids written questions", () => {
    const description = getToolDescription("start_quiz");

    expect(description.length).toBeGreaterThan(0);
    expect(description.toLowerCase()).toContain("runner");
    expect(description.toLowerCase()).toMatch(/never write/);
    expect(description.toLowerCase()).not.toContain("firecrawl");
    expect(description.toLowerCase()).not.toContain("tavily");
  });
});

describe("startQuiz note resolution (spec 0031, covers: AC-1, AC-7)", () => {
  it("opens on the conversation note when the model passes none", async () => {
    const out = (await tool()({}, { toolCallId: "t-conv", messages: [] })) as {
      ok: boolean;
      noteId: string | null;
      noteTitle: string | null;
    };

    expect(out).toEqual({ ok: true, noteId: "note-1", noteTitle: "Morphemes" });
  });

  it("prefers the explicit note after an owner check", async () => {
    dbMock("note", "findFirst").mockResolvedValue({
      id: "note-9",
      title: "Word formation",
    });

    const out = (await tool()(
      { noteId: "note-9" },
      { toolCallId: "t-explicit", messages: [] },
    )) as { ok: boolean; noteId: string | null; noteTitle: string | null };

    expect(out).toEqual({
      ok: true,
      noteId: "note-9",
      noteTitle: "Word formation",
    });
  });

  it("reads a foreign note as missing instead of opening it", async () => {
    dbMock("note", "findFirst").mockResolvedValue(null);

    const out = (await tool()(
      { noteId: "note-foreign" },
      { toolCallId: "t-foreign", messages: [] },
    )) as { ok: boolean; reason: string };

    expect(out).toEqual({ ok: false, reason: "missing" });
  });

  it("mounts the runner empty state when no note exists anywhere", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue({
      noteId: null,
    } as never);

    const out = (await tool()(
      {},
      { toolCallId: "t-nonote", messages: [] },
    )) as { ok: boolean; noteId: null; noteTitle: null };

    expect(out).toEqual({ ok: true, noteId: null, noteTitle: null });
  });

  it("mounts nothing foreign when the conversation belongs to another user", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue(null);

    const out = (await tool()(
      {},
      { toolCallId: "t-foreign-conv", messages: [] },
    )) as { ok: boolean; noteId: null; noteTitle: null };

    expect(out).toEqual({ ok: true, noteId: null, noteTitle: null });
  });
});
