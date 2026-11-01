import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { agent, streamChat } from "@/lib/ai/orchestrator";
import { createChatTools } from "@/lib/ai/tools";
import { logUsage } from "@/lib/ai/usage";
import { auth } from "@/lib/auth";
import {
  isKnownToolName,
  logUnknownTool,
  SILENT_TOOL_NAMES,
} from "@/lib/chat/activity-labels";
import { provisionalChatTitle } from "@/lib/chat/title";
import {
  extractTextFromParts,
  normalizeStoredParts,
} from "@/lib/chat-messages";
import { getChatResetWindow } from "@/lib/chat-usage";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { EVENTS, trackEvent } from "@/lib/kpi";
import {
  creditEnforcementEffective,
  getPlatformSettings,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getPrompt } from "@/lib/prompts/loader";
import { limit } from "@/lib/rate-limit";
import { getPlanLimits } from "@/lib/plan-limits";

export const runtime = "nodejs";

/** One chat turn may not carry more than this, measured as bytes not characters. */
const MAX_REQUEST_BYTES = 256 * 1024;

/** A single part stays under this many characters, checked before trimming. */
const MAX_PART_CHARS = 8000;

/**
 * The composer cap, mirrored here so a hand built request cannot carry an
 * unbounded pile of files past the client.
 */
const MAX_FILE_PARTS = 6;

const FILE_MEDIA_PREFIXES = ["image/"];
const FILE_MEDIA_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

/**
 * Document types that are read into text before the model call. The chat
 * model cannot open raw document file parts and rejects them (a fast 400),
 * so PDF, Word and text attachments travel as extracted text while images
 * keep flowing as file parts.
 */
const DOC_TEXT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

/** Characters of extracted document text kept per file for one turn. */
const CHAT_DOC_CHARS_PER_FILE = 12_000;
/** Total extracted document text kept for one turn. */
const CHAT_DOC_CHARS_TOTAL = 24_000;

/**
 * What the model is told when no note is attached to the turn. The prompt
 * declares this slot, so it has to say something honest rather than break.
 */
const NO_NOTE_CONTEXT =
  "No note is attached to this message. When the question calls for the student's own material, read it with your note tools instead of guessing.";

/**
 * Work that used to sit on the critical path. The duplicate check is a
 * diagnostic and the stats write is a counter, so neither may hold a student's
 * first token. Both run once the answer has started.
 */
async function runAfterFirstByte(input: {
  userId: string;
  conversationId: string;
  userContent: string;
  messageId?: string | null;
  quizId?: string | null;
}): Promise<void> {
  try {
    // Dedupe by message id. Two rows with the same id mean one resend.
    // The warn stays in server logs with ids only, never in the thread.
    if (input.messageId) {
      const count = await prisma.chatMessage.count({
        where: { id: input.messageId },
      });
      if (count > 1) {
        // Sampled so a retry storm does not flood logs.
        if (Math.random() < 0.2) {
          console.warn(
            `[CHAT] duplicate message id=${input.messageId} quiz=${input.quizId ?? "none"} conv=${input.conversationId}`,
          );
        }
        return;
      }
    }
    const recentUserMessages = await prisma.chatMessage.findMany({
      where: { conversationId: input.conversationId, role: "user" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { content: true },
    });
    const isDuplicate = recentUserMessages.some((msg) => {
      const existing = msg.content.trim().toLowerCase();
      const typed = input.userContent.trim().toLowerCase();
      return (
        existing === typed || (typed.length >= 10 && existing.includes(typed))
      );
    });
    if (isDuplicate) {
      if (Math.random() < 0.2) {
        console.warn(
          `[CHAT] duplicate message id=${input.messageId ?? "none"} quiz=${input.quizId ?? "none"} conv=${input.conversationId}`,
        );
      }
    }
  } catch {
    // Non-critical; never fail a turn over a diagnostic
  }

  try {
    const userStats = await prisma.userStats.findUnique({
      where: { userId: input.userId },
    });
    if (userStats) {
      await prisma.userStats.updateMany({
        where: { userId: input.userId },
        data: { totalChats: { increment: 1 } },
      });
    } else {
      await prisma.userStats.create({
        data: {
          userId: input.userId,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalChats: 1,
        },
      });
    }
  } catch (error) {
    console.error("[CHAT] Failed to record chat stats:", error);
  }
}

/**
 * The row id is the id the client already holds, so Regenerate and Edit can
 * name a message that was written in this same session. A row the client
 * loaded from the database keeps the id it was read with either way.
 */
async function saveMessage(input: {
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  parts: unknown;
  id?: string;
  stoppedAt?: Date;
}) {
  try {
    const msg = await prisma.chatMessage.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        conversationId: input.conversationId,
        userId: input.userId,
        role: input.role,
        content: input.content,
        parts: input.parts as never,
        ...(input.stoppedAt ? { stoppedAt: input.stoppedAt } : {}),
      },
    });

    await prisma.chatConversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    return msg;
  } catch (error) {
    // A client retry after a network error may resend the same message id.
    // If the message already exists, return it instead of failing the turn
    // with a P2002 unique constraint violation.
    if (
      input.id &&
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const existing = await prisma.chatMessage.findUnique({
        where: { id: input.id },
      });
      if (existing && existing.conversationId === input.conversationId) {
        await prisma.chatConversation.update({
          where: { id: input.conversationId },
          data: { updatedAt: new Date() },
        });
        return existing;
      }
    }
    throw error;
  }
}

type ConversationNote = {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  keyPoints: string[];
  extractedText: string | null;
};

/**
 * What the model sees about an attached note before it reads anything else.
 * The excerpt stops at 4000 characters; the note tools can read the rest.
 */
function noteContextFor(note: ConversationNote | null): string {
  if (!note) return NO_NOTE_CONTEXT;

  const keyPoints = note.keyPoints.filter(Boolean).join("; ");

  const lines = [
    `The student attached the note "${note.title}".`,
    note.summary ? `Summary: ${note.summary}` : "",
    keyPoints ? `Key points: ${keyPoints}` : "",
    note.extractedText
      ? `Excerpt (first 4000 characters):\n${note.extractedText.slice(0, 4000)}`
      : "",
    `Call getNoteContext with noteId "${note.id}" to read any part beyond the excerpt.`,
    `Call getNotePages to read the stored page numbers before naming any page (p. N).`,
  ].filter(Boolean);

  return lines.join("\n\n");
}

function toolNameOf(part: unknown): string {
  const type = (part as { type?: string }).type ?? "";
  if (type === "dynamic-tool") {
    return (part as { toolName?: string }).toolName ?? "";
  }
  return type.replace(/^tool-/, "");
}

/** A new tool must be noticed, never printed. One log line per unknown name. */
function logUnknownTools(parts: unknown): void {
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: string }).type;
    if (typeof type !== "string") continue;
    if (!type.startsWith("tool-") && type !== "dynamic-tool") continue;
    const name = toolNameOf(part);
    if (!name || SILENT_TOOL_NAMES.has(name)) continue;
    if (!isKnownToolName(name)) logUnknownTool(name);
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** A tool part that never produced an answer has no pair left to keep. */
function isFinishedToolPart(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const state = (part as { state?: unknown }).state;
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
}

function isToolPart(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const type = (part as { type?: unknown }).type;
  return typeof type === "string" && type.startsWith("tool-");
}

/**
 * Files travel as parts on the turn being sent. Only the newest user message
 * is checked with the strict cap: older messages were validated when they were
 * first sent, and an edit or retry of one must keep working with whatever URL
 * host its own era used.
 */
export function validateFileParts(messages: UIMessage[]): string | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser || !Array.isArray(lastUser.parts)) return null;

  let fileCount = 0;
  for (const part of lastUser.parts) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type !== "file") continue;

    fileCount += 1;
    if (fileCount > MAX_FILE_PARTS) {
      return `Too many files in one message (max ${MAX_FILE_PARTS})`;
    }

    const mediaType = (part as { mediaType?: unknown }).mediaType;
    if (
      typeof mediaType !== "string" ||
      (!FILE_MEDIA_PREFIXES.some((prefix) => mediaType.startsWith(prefix)) &&
        !FILE_MEDIA_TYPES.has(mediaType))
    ) {
      return "This file type is not supported";
    }

    const url = (part as { url?: unknown }).url;
    if (
      typeof url !== "string" ||
      !(url.startsWith("https://") || url.startsWith("data:text/plain"))
    ) {
      return "An attachment URL is not allowed";
    }
  }
  return null;
}

function cleanParts(message: UIMessage): UIMessage {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const kept = parts.filter(
    (part) => !isToolPart(part) || isFinishedToolPart(part),
  );
  return kept.length === parts.length
    ? message
    : { ...message, parts: kept as UIMessage["parts"] };
}

/**
 * A stopped answer keeps what arrived and drops a step that never returned.
 * A half finished tool part would otherwise reload as a permanent spinner.
 */
function settleStoppedParts(parts: UIMessage["parts"]): UIMessage["parts"] {
  return parts.filter((part) => !isToolPart(part) || isFinishedToolPart(part));
}

type ChatDocAttachment = {
  filename: string;
  mediaType: string;
  url: string;
};

export function chatDocAttachments(
  parts: UIMessage["parts"],
): ChatDocAttachment[] {
  if (!Array.isArray(parts)) return [];
  const docs: ChatDocAttachment[] = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    if ((part as { type?: unknown }).type !== "file") continue;
    const mediaType = (part as { mediaType?: unknown }).mediaType;
    const url = (part as { url?: unknown }).url;
    if (typeof mediaType !== "string" || typeof url !== "string") continue;
    if (!DOC_TEXT_TYPES.has(mediaType)) continue;
    if (!url.startsWith("https://")) continue;
    const filename = (part as { filename?: unknown }).filename;
    docs.push({
      filename: typeof filename === "string" ? filename : "attachment",
      mediaType,
      url,
    });
  }
  return docs;
}

async function extractPdfTextFromBytes(data: Uint8Array): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }
  return pages.join("\n");
}

/**
 * Reads document attachments into text for the model call. Each file is
 * fetched and parsed independently; a file that cannot be read is skipped
 * with a warning instead of failing the turn. Returns the text to append to
 * the turn plus how many document files were on it.
 */
export async function documentTextForChatTurn(
  parts: UIMessage["parts"],
): Promise<{ text: string; docFileCount: number }> {
  const docs = chatDocAttachments(parts);
  if (docs.length === 0) return { text: "", docFileCount: 0 };

  let remaining = CHAT_DOC_CHARS_TOTAL;
  const sections: string[] = [];
  await Promise.all(
    docs.map(async (doc) => {
      if (remaining <= 0) return;
      try {
        const fetched = await fetch(doc.url, {
          signal: AbortSignal.timeout(20_000),
        });
        if (!fetched.ok) {
          throw new Error(`Attachment fetch failed: ${fetched.status}`);
        }
        const bytes = new Uint8Array(await fetched.arrayBuffer());
        let raw: string;
        if (doc.mediaType === "application/pdf") {
          raw = await extractPdfTextFromBytes(bytes);
        } else if (
          doc.mediaType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          const mammoth = (await import("mammoth")).default;
          raw = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) }))
            .value;
        } else {
          raw = new TextDecoder().decode(bytes);
        }
        const cleaned = raw
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, Math.min(CHAT_DOC_CHARS_PER_FILE, remaining));
        if (cleaned) {
          remaining -= cleaned.length;
          sections.push(
            `[Attached file "${doc.filename}" — extracted text:]\n${cleaned}`,
          );
        }
      } catch (error) {
        console.warn(
          `[CHAT] Could not read attached document ${doc.filename}:`,
          error,
        );
      }
    }),
  );

  if (sections.length === 0) {
    const names = docs.map((doc) => doc.filename).join(", ");
    return {
      text: `[Note: the attached document(s) (${names}) could not be read. Answer from the typed question, and say the attachment could not be opened if it matters.]`,
      docFileCount: docs.length,
    };
  }
  return { text: sections.join("\n\n"), docFileCount: docs.length };
}

/**
 * Builds the model-bound copy of the thread: document file parts are dropped
 * (the model rejects them) and the extracted text travels as a text part on
 * the newest user message instead. The saved thread keeps the original file
 * parts, so attachments still render in the UI and reloads keep working.
 */
export function enrichLatestUserMessage(
  all: UIMessage[],
  docText: string,
  docFileCount: number,
): UIMessage[] {
  if (docFileCount === 0) return all;
  const index = all.reduce(
    (found, message, i) => (message.role === "user" ? i : found),
    -1,
  );
  if (index === -1) return all;
  const target = all[index];
  const parts = Array.isArray(target.parts) ? target.parts : [];
  const kept = parts.filter(
    (part) =>
      !(
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "file" &&
        typeof (part as { mediaType?: unknown }).mediaType === "string" &&
        DOC_TEXT_TYPES.has((part as { mediaType: string }).mediaType)
      ),
  );
  const next =
    docText.length > 0
      ? [...kept, { type: "text", text: docText } as never]
      : kept;
  if (next.length === parts.length && docText.length === 0) return all;
  return [
    ...all.slice(0, index),
    { ...target, parts: next },
    ...all.slice(index + 1),
  ];
}

/** Every row written after one message, in writing order. */
function afterMessage(
  conversationId: string,
  userId: string,
  target: { id: string; createdAt: Date },
) {
  return {
    conversationId,
    userId,
    OR: [
      { createdAt: { gt: target.createdAt } },
      { createdAt: target.createdAt, id: { gt: target.id } },
    ],
  };
}

/**
 * Trim the thread down to what the model needs. History is dropped from the
 * oldest turn until the request fits the byte ceiling, always keeping the turn
 * the student just sent. Unfinished tool parts go, since their answer was cut
 * away with the history they belonged to.
 */
function trimForModel(messages: UIMessage[]): UIMessage[] {
  const cleaned = messages.map(cleanParts);

  const kept: UIMessage[] = [];
  let bytes = 0;
  for (let index = cleaned.length - 1; index >= 0; index -= 1) {
    const message = cleaned[index];
    const size = byteLength(JSON.stringify(message));
    // The turn the student just wrote always travels, even on its own.
    if (kept.length > 0 && bytes + size > MAX_REQUEST_BYTES) break;
    kept.unshift(message);
    bytes += size;
  }
  return kept;
}

/**
 * Put a comment frame in front of the model stream, then copy it through.
 * The frame goes out the moment the headers are written, so a middlebox on a
 * congested cell never sees a silent connection during a slow prefill. SSE
 * comments are ignored by every parser, including the client's, so the frame
 * carries no meaning and costs a handful of bytes.
 */
function withKeepAlive(
  streamResponse: Response,
  startedAt: number,
  log: { userId: string; task: string },
): Response {
  const upstream = streamResponse.body;
  if (!upstream) return streamResponse;

  const encoder = new TextEncoder();
  let firstByteMs: number | null = null;
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(": keep-alive\n\n"));
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // The keep alive frame is not an answer, so the clock starts at the
          // first real chunk of stream content.
          if (firstByteMs === null) firstByteMs = Date.now() - startedAt;
          controller.enqueue(value);
        }
        // A student who closed the tab has already torn this stream down.
        if (!cancelled) controller.close();
      } catch (error) {
        console.error("[Chat] stream pump failed:", error);
        if (!cancelled) controller.error(error);
      } finally {
        reader.releaseLock();
        // Written after the stream so a student never waits on their own metrics.
        void logUsage({
          userId: log.userId,
          task: log.task,
          modelId: "stream",
          firstByteMs,
          keepAliveSent: true,
        }).catch(() => {});
      }
    },
    cancel(reason) {
      cancelled = true;
      void upstream.cancel(reason);
    },
  });

  return new Response(body, {
    status: streamResponse.status,
    headers: streamResponse.headers,
  });
}

export async function POST(req: Request) {
  try {
    const startedAt = Date.now();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nextReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
    });
    const rateLimitResponse = await limit("ai", nextReq);
    if (rateLimitResponse) return rateLimitResponse;

    const body = (await req.json()) as {
      messages?: UIMessage[];
      agentMode?: boolean;
      /** Set by the composer when a question is edited in place. */
      editMessageId?: string;
      /** Set by Retry and Regenerate when an answer is replaced. */
      retryMessageId?: string;
      // The AI SDK's own envelope. Read as well so the protocol and our own
      // fields cannot disagree about which message is being rewritten.
      trigger?: string;
      messageId?: string;
    };
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { error: "Too many messages (max 50)" },
        { status: 400 },
      );
    }

    for (const message of messages) {
      if (message.parts && Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            if (typeof text === "string" && text.length > MAX_PART_CHARS) {
              return NextResponse.json(
                {
                  error: `Message too long (max ${MAX_PART_CHARS} characters)`,
                },
                { status: 400 },
              );
            }
          }
        }
      }
    }

    const fileError = validateFileParts(messages);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const userId = session.user.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const { nextResetAt, windowStart } = getChatResetWindow();

    // Four independent reads in one pass. They were in sequence, which meant
    // round trips before the student saw a first token.
    const [conversation, subscription, settings, chatsToday] =
      await Promise.all([
        prisma.chatConversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            _count: { select: { messages: true } },
            note: {
              select: {
                id: true,
                userId: true,
                title: true,
                summary: true,
                keyPoints: true,
                extractedText: true,
              },
            },
          },
        }),
        prisma.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        getPlatformSettings(),
        prisma.chatMessage.count({
          where: {
            userId,
            role: "user",
            createdAt: { gte: windowStart, lt: nextResetAt },
          },
        }),
      ]);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return NextResponse.json(
        { error: "A user message is required" },
        { status: 400 },
      );
    }

    const plan = subscription?.plan || "FREE";
    const isPaid = plan !== "FREE" && subscription?.status === "ACTIVE";

    // An edit updates one stored question and removes what followed it. A
    // retry replaces one stored answer. Neither appends a question, so neither
    // writes a user row and neither counts toward the thread length.
    const retryTargetId =
      body.retryMessageId ??
      (body.trigger === "regenerate-message" ? body.messageId : undefined);
    const editTargetId =
      body.editMessageId ??
      (body.trigger === "submit-message" ? body.messageId : undefined);
    const isRewrite = Boolean(editTargetId || retryTargetId);

    const enforcement = creditEnforcementEffective(settings);
    const tutorCost = settings.creditCostAiTutorMessage;

    // Define daily message limits per plan
    const dailyLimits: Record<string, number> = {
      FREE: 8,
      STARTER: -1,
      STANDARD: -1,
      PREMIUM: -1,
      PRO: -1,
    };

    const resolvedLimit = getPlanLimits(plan).aiTutorMessages;
    const chatLimit =
      plan === "FREE" ? resolvedLimit : (dailyLimits[plan] ?? resolvedLimit);

    if (!isPaid) {
      if (chatLimit !== -1 && chatsToday >= chatLimit) {
        trackEvent(userId, EVENTS.LIMIT_HIT, {
          surface: "tip",
          kind: "tip_limit",
          used: chatsToday,
          cap: chatLimit,
        }).catch(() => {});
        return NextResponse.json(
          {
            error:
              "Your daily AI chat allowance is exhausted. You can still read previous conversations until the next reset.",
            code: "UPGRADE_REQUIRED",
            used: chatsToday,
            cap: chatLimit,
          },
          { status: 403 },
        );
      }
    }

    // Conversation length limit per plan
    const conversationLimits: Record<string, number> = {
      FREE: 50,
      STARTER: 100,
      STANDARD: 200,
      PREMIUM: 500,
    };
    const maxMessagesPerConversation = conversationLimits[plan] ?? 50;
    if (
      !isRewrite &&
      conversation._count.messages >= maxMessagesPerConversation
    ) {
      return NextResponse.json(
        {
          error: `This conversation has reached the ${maxMessagesPerConversation}-message limit. Please start a new conversation to continue.`,
        },
        { status: 403 },
      );
    }

    const normalizedUserParts = normalizeStoredParts(latestUserMessage.parts);
    const userContent = extractTextFromParts(normalizedUserParts);

    let userMsgRecord: { id: string } | null = null;

    if (editTargetId) {
      // The edited question is rewritten in place and every turn that followed
      // it is removed, so a reload can never resurrect the replaced answer.
      const target = await prisma.chatMessage.findFirst({
        where: {
          id: editTargetId,
          conversationId,
          userId,
          role: "user",
        },
        select: { id: true, createdAt: true },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 },
        );
      }

      await prisma.$transaction([
        prisma.chatMessage.update({
          where: { id: target.id },
          data: {
            content: userContent,
            parts: normalizedUserParts as never,
            stoppedAt: null,
          },
        }),
        prisma.chatMessage.deleteMany({
          where: afterMessage(conversationId, userId, target),
        }),
        prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);
      userMsgRecord = target;
    } else if (retryTargetId) {
      const target = await prisma.chatMessage.findFirst({
        where: {
          id: retryTargetId,
          conversationId,
          userId,
          role: "assistant",
        },
        select: { id: true, createdAt: true },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 },
        );
      }

      await prisma.$transaction([
        prisma.chatMessage.deleteMany({
          where: afterMessage(conversationId, userId, target),
        }),
        prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        }),
      ]);

      // The question is already stored. It keeps its place as the reference
      // for the credit ledger.
      userMsgRecord = await prisma.chatMessage.findFirst({
        where: { conversationId, userId, role: "user" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
    } else {
      // The student's turn is written before the stream starts. A closed tab
      // loses the answer, but it must not lose the question they asked.
      userMsgRecord = await saveMessage({
        conversationId,
        userId,
        role: "user",
        content: userContent,
        parts: normalizedUserParts,
        id: latestUserMessage.id,
      });
    }

    const conversationTitle = conversation.title;

    trackEvent(userId, EVENTS.CHAT_MESSAGE, { conversationId }).catch(() => {});

    if (!isRewrite && conversationTitle === "New Chat") {
      // A readable name is written before the stream starts, so the sidebar
      // never reads "New Chat" once the student has asked something. The model
      // refines it in the background.
      const provisionalTitle = provisionalChatTitle(userContent);
      if (provisionalTitle !== "New Chat") {
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { title: provisionalTitle },
        });
      }

      // Fire and forget. The title job is background work, and waiting on the
      // model would hold the first token hostage to a network call.
      inngest
        .send({
          name: "chat/generate-title",
          data: {
            conversationId,
            userContent,
            userId,
            provisionalTitle,
          },
        })
        .catch((titleError) => {
          console.error("[CHAT] Failed to enqueue chat title:", titleError);
        });
    }

    // The readiness score was cut with spec 0014. The prompt keeps the slot so
    // the template shape does not change, and the slot stays empty because the
    // app no longer holds a number to put in it.
    const profileContext = "";

    // A note belongs to the student who owns it, so a conversation that points
    // at someone else's note reads as no note at all.
    const attachedNote =
      conversation.note && conversation.note.userId === userId
        ? conversation.note
        : null;

    const { text: systemPrompt, settings: promptSettings } = await getPrompt(
      "chat",
      "chat_system",
      {
        userName: session.user.name,
        noteContext: noteContextFor(attachedNote),
        profileContext,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
      },
      { tools: true },
    );

    // Document attachments (PDF, Word, text) are read here and inlined as
    // text: the chat model cannot open raw document file parts and rejects
    // them, so sending them through fails the turn in ~2s. Images keep
    // flowing as file parts. The saved thread is untouched.
    const { text: docContextText, docFileCount } =
      await documentTextForChatTurn(
        Array.isArray(latestUserMessage.parts) ? latestUserMessage.parts : [],
      );
    const modelMessages = await convertToModelMessages(
      trimForModel(
        enrichLatestUserMessage(messages, docContextText, docFileCount),
      ),
    );

    const tools = createChatTools({
      userId: session.user.id,
      conversationId,
    });

    const agentMode = body.agentMode === true;

    if (agentMode) {
      // Deep reasoning path: non-streaming agent loop with chain fallback,
      // per-step logging, and tool-calling across up to maxSteps turns.
      const agentResult = await agent({
        task: "agent_reason",
        system: systemPrompt,
        tools,
        messages: modelMessages,
        maxSteps: 5,
        userId: session.user.id,
        modelOptions: {
          temperature: promptSettings.heat,
          maxOutputTokens: promptSettings.cap,
        },
      });

      const assistantContent = agentResult.text;

      await saveMessage({
        conversationId,
        userId,
        role: "assistant",
        content: assistantContent,
        parts: [{ type: "text", text: assistantContent }],
      });

      if (enforcement.aiTutor && tutorCost > 0) {
        try {
          const balance = await getUserCreditBalance(userId);
          if (balance >= tutorCost) {
            await spendCredits({
              userId,
              amount: tutorCost,
              type: "AI_TUTOR_MESSAGE",
              description: "TiC AI tutor message (agent)",
              referenceId: userMsgRecord?.id ?? conversationId,
            });
          }
        } catch (err) {
          console.error("[CHAT] Tutor credit debit failed (agent):", err);
        }
      }

      return NextResponse.json({
        text: assistantContent,
        steps: agentResult.steps,
        modelId: agentResult.modelId,
        task: "agent_reason",
      });
    }

    const result = await streamChat({
      task: "fast_chat",
      system: systemPrompt,
      tools,
      messages: modelMessages,
      userId: session.user.id,
      modelOptions: {
        stopWhen: stepCountIs(5),
        temperature: promptSettings.heat,
        maxOutputTokens: promptSettings.cap,
      },
    });

    const streamResponse = result.toUIMessageStreamResponse({
      onError: (err) => {
        console.error("[Chat] stream error:", err);
        return "Failed to generate response.";
      },
      onFinish: async ({ finishReason, isAborted, responseMessage }) => {
        // Runs with the stream alive, so the work lands even on serverless.
        void runAfterFirstByte({
          userId,
          conversationId,
          userContent,
          messageId: latestUserMessage.id ?? userMsgRecord?.id ?? null,
          quizId: null,
        }).catch(() => {});

        try {
          logUnknownTools(responseMessage.parts);

          const rawParts = normalizeStoredParts(responseMessage.parts);
          // A client stop cancels the stream before any finish chunk, so a
          // missing finish reason is what a stop looks like from here. The
          // SDK's own abort flag covers a provider side cut.
          const stopped = isAborted || finishReason === undefined;
          const assistantParts = stopped
            ? settleStoppedParts(rawParts)
            : rawParts;
          const assistantContent = extractTextFromParts(assistantParts);

          // A stop before the first token leaves no answer to keep. The
          // question stands alone and nothing half drawn is stored.
          if (stopped && assistantContent.length === 0) return;

          await saveMessage({
            conversationId,
            userId,
            role: "assistant",
            content: assistantContent,
            parts: assistantParts,
            id: responseMessage.id || undefined,
            ...(stopped ? { stoppedAt: new Date() } : {}),
          });

          if (enforcement.aiTutor && tutorCost > 0) {
            try {
              const balance = await getUserCreditBalance(userId);
              if (balance >= tutorCost) {
                await spendCredits({
                  userId,
                  amount: tutorCost,
                  type: "AI_TUTOR_MESSAGE",
                  description: "TiC AI tutor message",
                  referenceId: userMsgRecord?.id ?? conversationId,
                });
              }
            } catch (err) {
              console.error("[CHAT] Tutor credit debit failed:", err);
            }
          }
        } catch (err) {
          console.error("[CHAT] onFinish failed:", err);
        }
      },
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
    });

    return withKeepAlive(streamResponse, startedAt, {
      userId,
      task: "fast_chat",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
