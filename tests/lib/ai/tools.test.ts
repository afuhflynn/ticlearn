import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChatTools } from "@/lib/ai/tools";
import { getToolDescription } from "@/lib/prompts/loader";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/grounded-pages", () => ({
  getGroundedPageInputs: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

import {
  getEffectiveCreditCost,
  getUserCreditBalance,
  spendCredits,
} from "@/lib/credits";
import { getGroundedPageInputs } from "@/lib/grounded-pages";
import { inngest } from "@/lib/inngest/client";
import { getPlatformSettings } from "@/lib/platform-settings";

type Execute = (args: unknown, options: unknown) => Promise<unknown>;

function tool() {
  const tools = createChatTools({
    userId: "user-1",
    conversationId: "conv-1",
  });
  return tools.getNotePages.execute as unknown as Execute;
}

const SETTINGS = {
  creditCostPageLookup: 1,
  creditCostGroundedQuestion: 5,
  creditCostQuizGeneration: 10,
  creditCostAiTutorMessage: 5,
};

type MockFn = (...args: never[]) => Promise<unknown>;

function dbMock(
  model: string,
  method: string,
): {
  mockResolvedValue: (v: unknown) => void;
  mockReturnValue: (v: unknown) => void;
} {
  const db = prisma as unknown as Record<string, Record<string, MockFn>>;
  db[model] ??= {};
  db[model][method] ??= vi.fn();
  return db[model][method] as unknown as {
    mockResolvedValue: (v: unknown) => void;
    mockReturnValue: (v: unknown) => void;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock("chatConversation", "findFirst").mockResolvedValue({
    noteId: "note-1",
  });
  dbMock("note", "findFirst").mockResolvedValue({
    id: "note-1",
    title: "Photosynthesis",
  });
  dbMock("subscription", "findFirst").mockResolvedValue(null);
  vi.mocked(getPlatformSettings).mockResolvedValue(SETTINGS as never);
  vi.mocked(getEffectiveCreditCost).mockReturnValue(1);
  vi.mocked(getUserCreditBalance).mockResolvedValue(200);
  vi.mocked(spendCredits).mockResolvedValue({ balance: 199 });
  dbMock("page", "count").mockResolvedValue(0);
  dbMock("visualAnalysis", "count").mockResolvedValue(0);
});

describe("getNotePages tool description (AC-3)", () => {
  it("loads a prompt that talks about page numbers, never providers", () => {
    const description = getToolDescription("get_note_pages");

    expect(description.length).toBeGreaterThan(0);
    expect(description.toLowerCase()).toContain("page");
    expect(description.toLowerCase()).not.toContain("baseten");
    expect(description.toLowerCase()).not.toContain("meta");
  });

  it("takes only an optional note id, so steering stays owner checked", () => {
    const tools = createChatTools({
      userId: "user-1",
      conversationId: "conv-1",
    });
    const schema = tools.getNotePages.inputSchema as unknown as {
      shape: Record<string, unknown>;
    };

    expect(Object.keys(schema.shape)).toEqual(["noteId"]);
  });

  it("registers on the chat surface without breaking the old call shape", () => {
    const tools = createChatTools({ userId: "user-1" });

    expect(tools).toHaveProperty("getNotePages");
    expect(tools).toHaveProperty("getNoteContext");
    expect(tools).toHaveProperty("webSearch");
  });
});

describe("getNotePages empty note (AC-5)", () => {
  it("returns the pending shape and debits nothing when no page is analyzed", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue([]);

    const out = (await tool()({}, { toolCallId: "t-empty", messages: [] })) as {
      pages: unknown[];
      scanPending: boolean;
      noteTitle: string;
    };

    expect(out.pages).toEqual([]);
    expect(out.scanPending).toBe(true);
    expect(out.noteTitle).toBe("Photosynthesis");
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("marks the scan pending when pages exist but no analysis completed", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue([]);
    dbMock("page", "count").mockResolvedValue(4);
    dbMock("visualAnalysis", "count").mockResolvedValue(2);

    const out = (await tool()(
      {},
      { toolCallId: "t-pending", messages: [] },
    )) as { scanPending: boolean };

    expect(out.scanPending).toBe(true);
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("errors plainly when the conversation has no note attached", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue({
      noteId: null,
    } as never);

    await expect(
      tool()({}, { toolCallId: "t-nonote", messages: [] }),
    ).rejects.toThrow("no note attached");
    expect(spendCredits).not.toHaveBeenCalled();
  });
});

describe("getNotePages useful lookup (AC-3 AC-4)", () => {
  const INPUTS = [
    {
      pageNumber: 3,
      visualType: "DIAGRAM",
      description: "A photosynthesis diagram with chloroplast labels.",
      confidence: 0.91,
    },
  ];

  it("returns the stored pages with their real page numbers", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue(INPUTS);

    const out = (await tool()(
      {},
      { toolCallId: "t-useful", messages: [] },
    )) as {
      pages: { pageNumber: number; visualType: string }[];
      scanPending: boolean;
    };

    expect(out.pages).toHaveLength(1);
    expect(out.pages[0]?.pageNumber).toBe(3);
    expect(out.pages[0]?.visualType).toBe("DIAGRAM");
    expect(out.scanPending).toBe(false);
  });

  it("debits one lookup price keyed on the tool call id", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue(INPUTS);

    await tool()({}, { toolCallId: "t-debit", messages: [] });

    expect(spendCredits).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "PAGE_LOOKUP",
        referenceId: "pagelookup:t-debit",
      }),
    );
  });

  it("never double charges when the same call id is retried", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue(INPUTS);
    vi.mocked(spendCredits).mockResolvedValue({ balance: 199 });

    await tool()({}, { toolCallId: "t-retry", messages: [] });
    await tool()({}, { toolCallId: "t-retry", messages: [] });

    const calls = vi.mocked(spendCredits).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]).toMatchObject({ referenceId: "pagelookup:t-retry" });
    expect(calls[1]?.[0]).toMatchObject({ referenceId: "pagelookup:t-retry" });
  });

  it("blocks with a plain message when the balance cannot cover the lookup", async () => {
    vi.mocked(getGroundedPageInputs).mockResolvedValue(INPUTS);
    vi.mocked(spendCredits).mockRejectedValue(
      new Error("Insufficient credits. Need 1, have 0."),
    );

    await expect(
      tool()({}, { toolCallId: "t-broke", messages: [] }),
    ).rejects.toThrow("Insufficient credits");
  });
});

describe("getNotePages ownership (AC-7)", () => {
  it("unreachable foreign conversation reads as no note, never leaks pages", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue(null);
    vi.mocked(getGroundedPageInputs).mockResolvedValue([
      {
        pageNumber: 9,
        visualType: "TABLE",
        description: "Someone else's table.",
        confidence: 0.5,
      },
    ]);

    await expect(
      tool()({}, { toolCallId: "t-foreign-conv", messages: [] }),
    ).rejects.toThrow("no note attached");
    expect(getGroundedPageInputs).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("unreachable foreign note errors instead of returning its pages", async () => {
    dbMock("note", "findFirst").mockResolvedValue(null);

    await expect(
      tool()({}, { toolCallId: "t-foreign-note", messages: [] }),
    ).rejects.toThrow("Note not found");
    expect(getGroundedPageInputs).not.toHaveBeenCalled();
    expect(spendCredits).not.toHaveBeenCalled();
  });
});

describe("page scan self heal (spec 0028, covers: AC-3, AC-5)", () => {
  function noteMock(overrides: Record<string, unknown> = {}) {
    dbMock("note", "findFirst").mockResolvedValue({
      id: "note-1",
      title: "English notes",
      fileType: "PDF",
      status: "READY",
      ...overrides,
    });
  }

  function counts(pageCount: number, pendingCount: number, totalCount: number) {
    const mock = dbMock("page", "count");
    mock.mockResolvedValue(pageCount);
    const analyses = dbMock("visualAnalysis", "count") as unknown as {
      mockResolvedValueOnce: (v: unknown) => void;
      mockResolvedValue: (v: unknown) => void;
    };
    analyses.mockResolvedValueOnce(pendingCount);
    analyses.mockResolvedValueOnce(totalCount);
    analyses.mockResolvedValue(totalCount);
  }

  const send = () =>
    vi.mocked(inngest.send) as unknown as {
      mockResolvedValue: (v: unknown) => void;
      mockRejectedValue: (e: unknown) => void;
      mock: { calls: unknown[][] };
    };

  beforeEach(() => {
    noteMock();
    vi.mocked(getGroundedPageInputs).mockResolvedValue([]);
  });

  it("requeues the scan for a settled PDF with no page rows, and stays pending", async () => {
    counts(0, 0, 0);
    send().mockResolvedValue({ ids: ["evt-1"] });

    const out = (await tool()({}, { toolCallId: "t-heal", messages: [] })) as {
      pages: unknown[];
      scanPending: boolean;
      noteTitle: string;
    };

    expect(send().mock.calls).toEqual([
      [{ name: "note/uploaded", data: { noteId: "note-1" } }],
    ]);
    expect(out).toEqual({
      pages: [],
      scanPending: true,
      noteTitle: "English notes",
    });
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("requeues for an ERROR note too, since no pipe is in flight", async () => {
    noteMock({ status: "ERROR" });
    counts(0, 0, 0);
    send().mockResolvedValue({ ids: ["evt-2"] });

    await tool()({}, { toolCallId: "t-heal-error", messages: [] });

    expect(send().mock.calls).toHaveLength(1);
  });

  it("leaves a PROCESSING note alone, its upload event may be in flight", async () => {
    noteMock({ status: "PROCESSING" });
    counts(0, 0, 0);

    const out = (await tool()(
      {},
      { toolCallId: "t-processing", messages: [] },
    )) as { scanPending: boolean };

    expect(send().mock.calls).toHaveLength(0);
    expect(out.scanPending).toBe(true);
  });

  it("leaves non PDF notes alone, they have no pages to scan", async () => {
    noteMock({ fileType: "WORD" });
    counts(0, 0, 0);

    await tool()({}, { toolCallId: "t-word", messages: [] });

    expect(send().mock.calls).toHaveLength(0);
  });

  it("never requeues a note the pipeline already touched", async () => {
    counts(4, 0, 3);

    await tool()({}, { toolCallId: "t-touched", messages: [] });

    expect(send().mock.calls).toHaveLength(0);
  });

  it("still returns pending when the requeue send fails", async () => {
    counts(0, 0, 0);
    send().mockRejectedValue(new Error("Inngest down"));

    const out = (await tool()(
      {},
      { toolCallId: "t-send-fail", messages: [] },
    )) as { pages: unknown[]; scanPending: boolean };

    expect(out).toEqual({
      pages: [],
      scanPending: true,
      noteTitle: "English notes",
    });
    expect(spendCredits).not.toHaveBeenCalled();
  });
});

describe("getNotePages explicit note id (spec 0028, covers: AC-3, AC-7)", () => {
  function noteMock(overrides: Record<string, unknown> = {}) {
    dbMock("note", "findFirst").mockResolvedValue({
      id: "note-9",
      title: "Business law",
      fileType: "PDF",
      status: "READY",
      ...overrides,
    });
  }

  beforeEach(() => {
    noteMock();
    vi.mocked(getGroundedPageInputs).mockResolvedValue([
      {
        pageNumber: 4,
        visualType: "TEXT",
        description: "Formation steps.",
        confidence: 0.9,
      },
    ]);
  });

  it("serves the search resolved note without an attached conversation note", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue(null);

    const out = (await tool()(
      { noteId: "note-9" },
      { toolCallId: "t-explicit", messages: [] },
    )) as { pages: { pageNumber: number }[]; scanPending: boolean };

    expect(out.pages).toHaveLength(1);
    expect(out.pages[0]?.pageNumber).toBe(4);
    expect(out.scanPending).toBe(false);
  });

  it("works with no conversation at all when the id is supplied", async () => {
    const tools = createChatTools({ userId: "user-1" });
    const execute = tools.getNotePages.execute as unknown as Execute;

    const out = (await execute(
      { noteId: "note-9" },
      { toolCallId: "t-noconv", messages: [] },
    )) as { pages: { pageNumber: number }[] };

    expect(out.pages).toHaveLength(1);
  });

  it("prefers the explicit id over the conversation note", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue({
      noteId: "note-other",
    } as never);
    const noteFind = dbMock("note", "findFirst");

    await tool()(
      { noteId: "note-9" },
      { toolCallId: "t-prefer", messages: [] },
    );

    expect(noteFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "note-9", userId: "user-1" } }),
    );
  });

  it("reads a foreign id as not found and leaks nothing", async () => {
    dbMock("note", "findFirst").mockResolvedValue(null);

    await expect(
      tool()(
        { noteId: "note-foreign" },
        { toolCallId: "t-foreign-id", messages: [] },
      ),
    ).rejects.toThrow("Note not found");
    expect(spendCredits).not.toHaveBeenCalled();
  });

  it("still throws when neither an id nor a conversation note exists", async () => {
    dbMock("chatConversation", "findFirst").mockResolvedValue({
      noteId: null,
    } as never);

    await expect(
      tool()({}, { toolCallId: "t-neither", messages: [] }),
    ).rejects.toThrow("no note attached");
  });
});
