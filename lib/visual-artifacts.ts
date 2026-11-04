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
  textSteps: z.array(z.string().min(1).max(280)).max(3).optional().default([]),
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
  /^\s*(graph|flowchart|sequenceDiagram|xychart|xychart-beta)\b/i;

export function sanitizeMermaidSource(raw: string): string | null {
  if (!raw) return null;
  const out = raw
    .trim()
    // Strip fenced code blocks the model sometimes wraps around the diagram.
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, 20_000);
  // Repair a missing or invalid direction on the first line: `graph`,
  // `flowchart` alone, or `graph foo` all become `graph TD` / `flowchart TD`
  // instead of rejecting a drawable diagram.
  const repaired = out.replace(
    /^\s*(graph|flowchart)\b[^\S\n]*(?:([A-Za-z]{2,4})(?![A-Za-z]))?/,
    (_m, kw: string, dir?: string) => {
      const d = (dir ?? "").toUpperCase();
      if (["TD", "TB", "LR", "RL", "BT"].includes(d)) return `${kw} ${d}`;
      return `${kw} TD`;
    },
  );
  if (!MERMAID_HEADS.test(repaired)) return null;
  if (
    /^\s*graph\b/i.test(repaired) &&
    !/graph\s+(TD|TB|LR|RL|BT)/.test(repaired)
  ) {
    return null;
  }
  return repaired;
}

/** Suffix forcing the SVG medium on the second-chance draw attempt. */
const SVG_ONLY_SUFFIX = '\nReturn format "svg" only. No mermaid.';

/** True for free-fall / free-body concepts that deserve a guaranteed diagram. */
export function matchesFreeFallConcept(concept: string): boolean {
  const c = concept.toLowerCase();
  const hasFall = /free[-\s]?fall|free[-\s]?body/.test(c);
  const hasGravity =
    /weight|gravity|free fall|falling|projectile/.test(c) &&
    /force|weight|gravity|velocity|acceleration|fall|body/.test(c);
  return hasFall || hasGravity;
}

/** Deterministic SVG fallback: weight, velocity and acceleration vectors. */
export function buildFreeFallSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img">
  <title>Free body diagram of an object in free fall</title>
  <line x1="20" y1="40" x2="220" y2="40" stroke="black" stroke-width="2"/>
  <line x1="30" y1="40" x2="40" y2="30" stroke="black" stroke-width="1.5"/>
  <line x1="50" y1="40" x2="60" y2="30" stroke="black" stroke-width="1.5"/>
  <line x1="70" y1="40" x2="80" y2="30" stroke="black" stroke-width="1.5"/>
  <circle cx="120" cy="130" r="22" fill="none" stroke="black" stroke-width="2"/>
  <line x1="120" y1="152" x2="120" y2="250" stroke="black" stroke-width="2"/>
  <polygon points="120,260 113,248 127,248" fill="black"/>
  <text x="130" y="215" font-size="13" fill="black">W = mg</text>
  <line x1="160" y1="130" x2="160" y2="210" stroke="black" stroke-width="2"/>
  <polygon points="160,220 153,208 167,208" fill="black"/>
  <text x="168" y="180" font-size="13" fill="black">v</text>
  <line x1="80" y1="130" x2="80" y2="190" stroke="black" stroke-width="2"/>
  <polygon points="80,200 73,188 87,188" fill="black"/>
  <text x="88" y="170" font-size="13" fill="black">g</text>
  <text x="120" y="300" font-size="12" text-anchor="middle" fill="black">Free fall: only weight acts</text>
</svg>`;
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
  if (!concept) return 0;
  // Note-free draws count too, matched by user plus concept with a null
  // note, so a chat with no note in play cannot draw without limit.
  return prisma.visualArtifact.count({
    where: {
      userId,
      noteId: key.noteId ?? null,
      concept,
      createdAt: { gte, lt },
    },
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
      caption: string;
      textSteps: string[];
    }
  | {
      ok: false;
      reason: "cap" | "invalid" | "failed";
      message: string;
      textSteps: string[];
    }
> {
  const concept = input.concept.trim().slice(0, 160);
  const fallbackSteps = [
    `Name the parts of ${concept || "this idea"} in your own words.`,
    `Trace how each part leads to the next.`,
    `Say when you would use ${concept || "this idea"} in an exam answer.`,
  ];
  if (!concept) {
    return {
      ok: false,
      reason: "invalid",
      message: "A concept is needed to draw.",
      textSteps: fallbackSteps,
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
      textSteps: fallbackSteps,
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
    let format: DrawFormat = object.format;
    if (object.format === "svg") {
      payload = sanitizeSvgMarkup(object.payload);
    } else {
      payload = sanitizeMermaidSource(object.payload);
      if (payload) {
        // Regex-clean is not parse-clean: confirm with Mermaid's own
        // parser before storing, so an unrenderable diagram never lands.
        try {
          const { default: mermaid } = await import("mermaid");
          mermaid.initialize({ startOnLoad: false });
          await mermaid.parse(payload);
        } catch {
          payload = null;
        }
      }
    }
    // Second chance: the model picked the wrong medium (mermaid for physics
    // vectors is the classic miss). One retry forcing SVG beats giving up.
    if (!payload) {
      try {
        const retry = await generate({
          task: "visual_draw",
          schema: drawOutputSchema,
          prompt: text + SVG_ONLY_SUFFIX,
          userId: input.userId,
          ...fields,
        });
        const svg = sanitizeSvgMarkup(retry.object.payload);
        if (svg) {
          payload = svg;
          format = "svg";
        }
      } catch {
        // A retry failure falls through to the deterministic fallback below.
      }
    }
    if (!payload && matchesFreeFallConcept(concept)) {
      // Guaranteed diagram for the reported case: weight, velocity and
      // acceleration vectors for a body in free fall. Stored like any draw
      // so it renders, retries and counts normally.
      const svg = sanitizeSvgMarkup(buildFreeFallSvg());
      if (svg) {
        payload = svg;
        format = "svg";
      }
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
        textSteps: fallbackSteps,
      };
    }

    const row = await prisma.visualArtifact.create({
      data: {
        userId: input.userId,
        noteId: input.noteId ?? null,
        kind: "drawn",
        format,
        concept: concept.toLowerCase(),
        sourcePage: null,
        originAnswerId: input.answerId ?? null,
        payload,
        altText: object.altText.slice(0, 500),
      },
      select: { id: true },
    });
    const caption = (object.caption ?? "").trim().slice(0, 140);
    const modelSteps = Array.isArray(object.textSteps)
      ? object.textSteps
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0)
          .slice(0, 3)
      : [];
    return {
      ok: true,
      id: row.id,
      format,
      payload,
      altText: object.altText.trim().slice(0, 500) || `Diagram of ${concept}`,
      caption: caption || object.altText.trim().slice(0, 140),
      textSteps: modelSteps.length > 0 ? modelSteps : fallbackSteps,
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
      textSteps: fallbackSteps,
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
    where: { noteId, pageImageUrl: { not: null } },
    orderBy: { pageNumber: "asc" },
    take: VISUAL_SCANS_PER_NOTE_CAP,
    select: { pageNumber: true, pageImageUrl: true, hasVisual: true },
  });
  const total = await prisma.page.count({ where: { noteId } });
  const scans: UnifiedArtItem[] = pages.map((p) => ({
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
