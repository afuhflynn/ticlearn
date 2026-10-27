import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateFileParts } from "@/app/api/ai/chat/route";

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
