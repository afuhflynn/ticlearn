import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import { generate } from "@/lib/ai/orchestrator";
import { logUsage } from "@/lib/ai/usage";
import { prisma } from "@/lib/prisma";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

export const VISUAL_DRAW_CAP_PER_DAY = 3;
export const VISUAL_SVG_MAX_BYTES = 200_000;
export const VISUAL_SCANS_PER_NOTE_CAP = 50;

const drawOutputSchema = z.object({
  format: z.enum(["mermaid", "svg"]),
  payload: z
    .string()
    .min(1)
    .max(VISUAL_SVG_MAX_BYTES + 10_000),
  altText: z.string().min(1).max(500),
  caption: z.string().max(140).optional().default(""),
});

export type DrawFormat = "mermaid" | "svg";

function utcDayBounds(now = new Date()): { gte: Date; lt: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function canonicalDrawKey(parts: {
  answerId?: string | null;
  noteId?: string | null;
  concept?: string | null;
}): string {
  if (parts.answerId) return `answer:${parts.answerId}`;
  const note = (parts.noteId ?? "none").trim() || "none";
  const concept = (parts.concept ?? "").trim().toLowerCase();
  return `note:${note}:${concept}`;
}

/** Server side SVG scrub with the DOMPurify svg profile before store.
 *  Rows stay script free from day one; the client scrubs again at render. */
export function sanitizeSvgMarkup(raw: string): string | null {
  if (!raw || raw.length > VISUAL_SVG_MAX_BYTES) return null;
  if (!raw.toLowerCase().includes("<svg")) return null;
  const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } });
  if (!clean || /<script/i.test(clean) || /\son\w+\s*=/i.test(clean)) {
    return null;
  }
  return clean;
}

const MERMAID_HEADS =
  /^\s*(graph|flowchart|sequenceDiagram|gantt|xychart|xychart-beta|pie|mindmap|timeline)\b/i;

export function sanitizeMermaidSource(raw: string): string | null {
  if (!raw) return null;
  const out = raw
    .trim()
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, 20_000);
  if (!MERMAID_HEADS.test(out)) return null;
  if (/^\s*graph\b/i.test(out) && !/graph\s+(TD|TB|LR|RL|BT)/.test(out)) {
    return null;
  }
  return out;
}

async function countDrawsForKey(
  userId: string,
  key: {
    answerId?: string | null;
    noteId?: string | null;
    concept?: string | null;
  },
): Promise<number> {
  const { gte, lt } = utcDayBounds();
  if (key.answerId) {
    return prisma.visualArtifact.count({
      where: { userId, originAnswerId: key.answerId, createdAt: { gte, lt } },
    });
  }
  const concept = (key.concept ?? "").trim().toLowerCase().slice(0, 160);
  if (!key.noteId || !concept) return 0;
  return prisma.visualArtifact.count({
    where: { userId, noteId: key.noteId, concept, createdAt: { gte, lt } },
  });
}

export async function generateVisualArtifact(input: {
  userId: string;
  answerId?: string | null;
  noteId?: string | null;
  concept: string;
  context?: string;
  formatHint?: DrawFormat;
}): Promise<
  | {
      ok: true;
      id: string;
      format: DrawFormat;
      payload: string;
      altText: string;
    }
  | { ok: false; reason: "cap" | "invalid" | "failed"; message: string }
> {
  const concept = input.concept.trim().slice(0, 160);
  if (!concept) {
    return {
      ok: false,
      reason: "invalid",
      message: "A concept is needed to draw.",
    };
  }
  const key = { answerId: input.answerId, noteId: input.noteId, concept };
  const used = await countDrawsForKey(input.userId, key);
  if (used >= VISUAL_DRAW_CAP_PER_DAY) {
    await logUsage({
      userId: input.userId,
      task: "visual_draw",
      modelId: "cap",
      latencyMs: 0,
      errorCode: "cap_reached",
    }).catch(() => {});
    return {
      ok: false,
      reason: "cap",
      message: "Daily draw limit reached for this idea. Try again tomorrow.",
    };
  }

  const started = Date.now();
  try {
    const { text, settings } = await getPrompt("draw", "explain_and_draw", {
      concept,
      context: (input.context ?? "").slice(0, 4000) || "No note excerpt.",
    });
    const fields = promptCallFields(settings);
    const { object, modelId } = await generate({
      task: "visual_draw",
      schema: drawOutputSchema,
      prompt: text,
      userId: input.userId,
      ...fields,
    });

    let payload: string | null = null;
    if (object.format === "svg") {
      payload = sanitizeSvgMarkup(object.payload);
    } else {
      payload = sanitizeMermaidSource(object.payload);
    }
    if (!payload) {
      await logUsage({
        userId: input.userId,
        task: "visual_draw",
        modelId,
        latencyMs: Date.now() - started,
        errorCode: "invalid_output",
      }).catch(() => {});
      return {
        ok: false,
        reason: "invalid",
        message: "The drawing came back unreadable, here is the text instead.",
      };
    }

    const row = await prisma.visualArtifact.create({
      data: {
        userId: input.userId,
        noteId: input.noteId ?? null,
        kind: "drawn",
        format: object.format,
        concept: concept.toLowerCase(),
        sourcePage: null,
        originAnswerId: input.answerId ?? null,
        payload,
        altText: object.altText.slice(0, 500),
      },
      select: { id: true },
    });
    return {
      ok: true,
      id: row.id,
      format: object.format,
      payload,
      altText: object.altText.slice(0, 500),
    };
  } catch (error) {
    await logUsage({
      userId: input.userId,
      task: "visual_draw",
      modelId: "none",
      latencyMs: Date.now() - started,
      errorCode: error instanceof Error ? error.name : "failed",
    }).catch(() => {});
    return {
      ok: false,
      reason: "failed",
      message: "The drawing failed, here is the text instead.",
    };
  }
}

export type UnifiedArtItem =
  | {
      kind: "scan";
      pageNumber: number;
      imageUrl: string;
      altText: string;
      total: number;
    }
  | {
      kind: "drawn";
      id: string;
      format: DrawFormat;
      payload: string;
      altText: string;
      sourcePage: number | null;
      createdAt: string;
    };

export async function readArtForNote(
  userId: string,
  noteId: string,
): Promise<{
  scans: UnifiedArtItem[];
  drawn: UnifiedArtItem[];
  total: number;
}> {
  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
    select: { id: true },
  });
  if (!note) throw new Error("missing");
  const pages = await prisma.page.findMany({
    where: { noteId },
    orderBy: { pageNumber: "asc" },
    take: VISUAL_SCANS_PER_NOTE_CAP + 1,
    select: { pageNumber: true, pageImageUrl: true, hasVisual: true },
  });
  const total = await prisma.page.count({ where: { noteId } });
  const scans: UnifiedArtItem[] = pages
    .filter((p) => p.pageImageUrl)
    .slice(0, VISUAL_SCANS_PER_NOTE_CAP)
    .map((p) => ({
      kind: "scan" as const,
      pageNumber: p.pageNumber,
      imageUrl: p.pageImageUrl as string,
      altText: `Page ${p.pageNumber} figure from your note`,
      total,
    }));
  const drawnRows = await prisma.visualArtifact.findMany({
    where: { userId, noteId },
    orderBy: [{ sourcePage: "asc" }, { createdAt: "asc" }],
    take: 50,
    select: {
      id: true,
      format: true,
      payload: true,
      altText: true,
      sourcePage: true,
      createdAt: true,
    },
  });
  const drawn: UnifiedArtItem[] = drawnRows.map((r) => ({
    kind: "drawn" as const,
    id: r.id,
    format: (r.format === "svg" ? "svg" : "mermaid") as DrawFormat,
    payload: r.payload ?? "",
    altText: r.altText,
    sourcePage: r.sourcePage,
    createdAt: r.createdAt.toISOString(),
  }));
  return { scans, drawn, total };
}

export async function readArtForAnswer(
  userId: string,
  answerId: string,
): Promise<UnifiedArtItem[]> {
  const answer = await prisma.quizAttemptAnswer.findFirst({
    where: { id: answerId, attempt: { userId } },
    select: {
      id: true,
      attempt: { select: { quizId: true } },
    },
  });
  if (!answer) throw new Error("missing");
  const rows = await prisma.visualArtifact.findMany({
    where: { userId, originAnswerId: answerId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      format: true,
      payload: true,
      altText: true,
      sourcePage: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    kind: "drawn" as const,
    id: r.id,
    format: (r.format === "svg" ? "svg" : "mermaid") as DrawFormat,
    payload: r.payload ?? "",
    altText: r.altText,
    sourcePage: r.sourcePage,
    createdAt: r.createdAt.toISOString(),
  }));
}
