import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chatDocAttachments,
  documentTextForChatTurn,
  enrichLatestUserMessage,
  POST,
  validateFileParts,
} from "@/app/api/ai/chat/route";
import { auth } from "@/lib/auth";
import { streamChat } from "@/lib/ai/orchestrator";
import { createChatTools } from "@/lib/ai/tools";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getPrompt } from "@/lib/prompts/loader";

/**
 * The chat route is the last wall between a hand built request and the model.
 * These tests drive the file-part validation directly, the way a crafted
 * client would send it.
 */

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/orchestrator", () => ({
  agent: {},
  streamChat: vi.fn(),
}));
vi.mock("@/lib/ai/tools", () => ({ createChatTools: vi.fn() }));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/lib/prompts/loader", () => ({ getPrompt: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

function messageWithFiles(
  files: { mediaType: string; url: string }[],
  role: "user" | "assistant" = "user",
): UIMessage {
  return {
    id: "m-1",
    role,
    parts: [
      ...files.map((file) => ({ type: "file", ...file })),
      { type: "text", text: "Look at these" },
    ],
  } as unknown as UIMessage;
}

const BLOB_URL = "https://x.public.blob.vercel-storage.com/chat/u/a.png";
const PASTE_URL = "data:text/plain;base64,SGVsbG8=";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateFileParts", () => {
  it("accepts the cap of six files over the allowed types", () => {
    const messages = [
      messageWithFiles(
        Array.from({ length: 6 }, () => ({
          mediaType: "image/png",
          url: BLOB_URL,
        })),
      ),
    ];

    expect(validateFileParts(messages)).toBeNull();
  });

  it("rejects a seventh file", () => {
    const messages = [
      messageWithFiles(
        Array.from({ length: 7 }, () => ({
          mediaType: "image/png",
          url: BLOB_URL,
        })),
      ),
    ];

    expect(validateFileParts(messages)).toBe(
      "Too many files in one message (max 6)",
    );
  });

  it("rejects a media type the composer cannot produce", () => {
    const messages = [
      messageWithFiles([
        { mediaType: "application/x-msdownload", url: BLOB_URL },
      ]),
    ];

    expect(validateFileParts(messages)).toBe("This file type is not supported");
  });

  it("rejects a url that is neither https nor a plain text paste", () => {
    const messages = [
      messageWithFiles([
        { mediaType: "image/png", url: "javascript:alert(1)" },
      ]),
    ];

    expect(validateFileParts(messages)).toBe(
      "An attachment URL is not allowed",
    );
  });

  it("accepts a pasted text data url", () => {
    const messages = [
      messageWithFiles([{ mediaType: "text/plain", url: PASTE_URL }]),
    ];

    expect(validateFileParts(messages)).toBeNull();
  });

  it("leaves older turns alone, so an edit of a legacy message keeps working", () => {
    const messages = [
      // A file from the uploadthing era: an https url of a host the current
      // composer no longer produces, and no exact media type match.
      messageWithFiles([
        { mediaType: "image/jpg", url: "https://utfs.io/f/old" },
      ]),
      messageWithFiles([]),
    ];
    // The last user message is the empty one; the legacy row sits before it.
    const history = [...messages];
    history.unshift({
      id: "m-0",
      role: "user",
      parts: [
        {
          type: "file",
          mediaType: "image/gif",
          url: "https://a.b.c/legacy.gif",
        },
      ],
    } as unknown as UIMessage);

    expect(validateFileParts(history)).toBeNull();
  });
});

describe("chatDocAttachments", () => {
  it("picks document https parts and ignores images and pastes", () => {
    const parts = [
      {
        type: "file",
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename: "notes.docx",
        url: "https://x.public.blob.vercel-storage.com/chat/u/notes.docx",
      },
      { type: "file", mediaType: "image/png", url: BLOB_URL },
      { type: "file", mediaType: "text/plain", url: PASTE_URL },
      { type: "text", text: "hello" },
    ] as unknown as UIMessage["parts"];

    const docs = chatDocAttachments(parts);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.filename).toBe("notes.docx");
  });

  it("returns nothing when there are no document attachments", () => {
    const parts = [
      { type: "file", mediaType: "image/png", url: BLOB_URL },
      { type: "text", text: "hello" },
    ] as unknown as UIMessage["parts"];

    expect(chatDocAttachments(parts)).toEqual([]);
  });
});

describe("enrichLatestUserMessage", () => {
  const docxPart = {
    type: "file",
    mediaType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "notes.docx",
    url: "https://x.public.blob.vercel-storage.com/chat/u/notes.docx",
  };

  function thread(): UIMessage[] {
    return [
      {
        id: "m-0",
        role: "user",
        parts: [{ type: "text", text: "first" }],
      } as unknown as UIMessage,
      {
        id: "m-1",
        role: "user",
        parts: [
          docxPart,
          {
            type: "file",
            mediaType: "image/png",
            url: BLOB_URL,
          },
          { type: "text", text: "Explain this" },
        ],
      } as unknown as UIMessage,
    ];
  }

  it("returns the thread untouched when there are no documents", () => {
    const all = thread();
    expect(enrichLatestUserMessage(all, "", 0)).toBe(all);
  });

  it("drops document file parts and appends the extracted text on the newest user message", () => {
    const enriched = enrichLatestUserMessage(thread(), "extracted doc text", 1);

    expect(enriched).toHaveLength(2);
    // The older turn is untouched.
    expect(enriched[0]?.parts).toHaveLength(1);
    const parts = enriched[1]?.parts as unknown[];
    // Image stays, docx goes, extracted text lands last.
    expect(parts).toHaveLength(3);
    expect(
      parts.some(
        (part) =>
          (part as { type?: string }).type === "file" &&
          (part as { mediaType?: string }).mediaType === "image/png",
      ),
    ).toBe(true);
    expect(
      parts.some(
        (part) =>
          (part as { type?: string }).type === "file" &&
          (part as { mediaType?: string }).mediaType?.includes(
            "wordprocessingml",
          ),
      ),
    ).toBe(false);
    expect(parts.at(-1)).toMatchObject({
      type: "text",
      text: "extracted doc text",
    });
  });
});

describe("documentTextForChatTurn", () => {
  const textPart = {
    type: "file",
    mediaType: "text/plain",
    filename: "pasted.txt",
    url: "https://x.public.blob.vercel-storage.com/chat/u/pasted.txt",
  } as unknown;

  it("inlines a readable text attachment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () =>
          new TextEncoder().encode("The mitochondria is the powerhouse.")
            .buffer,
      })),
    );

    const { text, docFileCount } = await documentTextForChatTurn([
      textPart,
    ] as never);

    expect(docFileCount).toBe(1);
    expect(text).toContain("pasted.txt");
    expect(text).toContain("The mitochondria is the powerhouse.");
    vi.unstubAllGlobals();
  });

  it("falls back to an honest note instead of failing the turn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const { text, docFileCount } = await documentTextForChatTurn([
      textPart,
    ] as never);

    expect(docFileCount).toBe(1);
    expect(text).toContain("could not be read");
    vi.unstubAllGlobals();
  });

  it("does nothing when there are no document attachments", async () => {
    const { text, docFileCount } = await documentTextForChatTurn([
      { type: "text", text: "hi" },
    ] as never);

    expect(text).toBe("");
    expect(docFileCount).toBe(0);
  });
});

describe("POST conversation scoping (AC-7)", () => {
  const db = prisma as unknown as Record<string, Record<string, unknown>>;

  function userMessage(): UIMessage {
    return {
      id: "m-1",
      role: "user",
      parts: [{ type: "text", text: "Which page covers photosynthesis?" }],
    } as unknown as UIMessage;
  }

  function postRequest(conversationId: string | null) {
    const url =
      conversationId === null
        ? "http://localhost/api/ai/chat"
        : `http://localhost/api/ai/chat?conversationId=${conversationId}`;
    return new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [userMessage()] }),
    });
  }

  beforeEach(() => {
    db.chatConversation = {
      findFirst: vi.fn(async () => ({
        id: "conv-1",
        title: "New Chat",
        _count: { messages: 1 },
        note: {
          id: "note-1",
          userId: "u-1",
          title: "Biology",
          summary: null,
          keyPoints: [],
          extractedText: null,
        },
      })),
      update: vi.fn(async () => ({})),
    };
    db.subscription = { findFirst: vi.fn(async () => null) };
    db.chatMessage = {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "m-1" })),
    };
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u-1", name: "A" },
    } as never);
    vi.mocked(getPrompt).mockResolvedValue({
      text: "system",
      settings: { heat: 0.4, cap: 8000 },
    } as never);
    vi.mocked(streamChat).mockResolvedValue({
      toUIMessageStreamResponse: () =>
        new Response("data: done\n\n", {
          headers: { "content-type": "text/event-stream" },
        }),
    } as never);
    vi.mocked(createChatTools).mockReturnValue({} as never);
    vi.mocked(inngest.send).mockResolvedValue(undefined as never);
  });

  it("hands the conversation id to the tool factory, so page lookups stay scoped", async () => {
    const response = await POST(postRequest("conv-1"));

    expect(response.status).toBe(200);
    expect(createChatTools).toHaveBeenCalledWith({
      userId: "u-1",
      conversationId: "conv-1",
    });
  });

  it("still requires a conversation id before any tool is built", async () => {
    const response = await POST(postRequest(null));

    expect(response.status).toBe(400);
    expect(createChatTools).not.toHaveBeenCalled();
  });
});
