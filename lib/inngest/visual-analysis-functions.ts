import { put } from "@vercel/blob";
import { generateObject } from "ai";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { chainModel, chainMuse, OPEN_WEIGHT_CHAIN } from "@/lib/ai/chain";
import {
  type PageScanResult,
  renderSinglePageImage,
  scanPages,
  toVisualTypeEnum,
} from "@/lib/ai/page-scan";
import {
  extractPageTextsFromBytes,
  PAGE_TEXT_EXCERPT_CHARS,
  pageTextExcerpt,
} from "@/lib/ai/page-texts";
import { MUSE_COST_PER_CALL_XAF } from "@/lib/ai/pricing";
import { logUsage, usageFromResult } from "@/lib/ai/usage";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getPrompt } from "@/lib/prompts/loader";

const utapi = new UTApi();
const PAGE_IMAGE_PREFIX = "visual-analysis/";
const USD_TO_XAF_RATE = 650;

/** Shape Baseten must return for one visual page. */
const visualAnalysisSchema = z.object({
  visualType: z.enum(["diagram", "chart", "table", "illustration", "other"]),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

/** Fetch one note's PDF as bytes via its UploadThing signed URL. */
async function fetchNotePdfBytes(uploadthingKey: string): Promise<Uint8Array> {
  const { ufsUrl } = await utapi.generateSignedURL(uploadthingKey);
  const response = await fetch(ufsUrl, {
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch note PDF: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Store one rendered page image in Vercel Blob and return its public URL. */
async function storePageImage(
  noteId: string,
  pageNumber: number,
  imageBuffer: Buffer,
): Promise<string> {
  const result = await put(
    `${PAGE_IMAGE_PREFIX}${noteId}/page-${pageNumber}.png`,
    imageBuffer,
    { access: "public", contentType: "image/png" },
  );
  return result.url;
}

/** Analyse one visual page: Baseten first, OpenRouter vision as fallback.
 *  The visual job bypasses the orchestrator (it needs image parts), so the
 *  fallback lives here instead of in the chain walk. Each leg gets its own
 *  120 second budget so one hung provider cannot strand the invocation. */
async function analyseVisualPage(
  imageRef: string,
  pageNumber: number,
): Promise<{
  visualType: "DIAGRAM" | "CHART" | "TABLE" | "ILLUSTRATION" | "OTHER";
  description: string;
  confidence: number;
  fallbackUsed: boolean;
}> {
  const { text: prompt, settings } = await getPrompt(
    "ingest",
    "visual_analysis",
    {
      pageNumber: String(pageNumber),
    },
  );
  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: prompt },
        { type: "image" as const, image: imageRef },
      ],
    },
  ];
  try {
    const result = await generateObject({
      model: chainMuse("meta-models/muse-spark-open-1026"),
      schema: visualAnalysisSchema,
      messages,
      temperature: settings.heat,
      maxOutputTokens: settings.cap,
      abortSignal: AbortSignal.timeout(120_000),
    });
    return {
      visualType: toVisualTypeEnum(result.object.visualType),
      description: result.object.description,
      confidence: result.object.confidence,
      fallbackUsed: false,
    };
  } catch (basetenError) {
    console.warn(
      `[Visual Analysis] Baseten failed page ${pageNumber}, trying OpenRouter fallback:`,
      basetenError instanceof Error ? basetenError.message : basetenError,
    );
    const fallback = await generateObject({
      model: chainModel(OPEN_WEIGHT_CHAIN[0]),
      schema: visualAnalysisSchema,
      messages,
      temperature: settings.heat,
      maxOutputTokens: settings.cap,
      abortSignal: AbortSignal.timeout(120_000),
    });
    const parsed = usageFromResult(
      fallback as unknown as { usage?: unknown },
      OPEN_WEIGHT_CHAIN[0],
    );
    await logUsage({
      userId: null,
      task: "visual_analysis",
      modelId: OPEN_WEIGHT_CHAIN[0],
      promptTokens: parsed.promptTokens,
      completionTokens: parsed.completionTokens,
      costUsd: parsed.costUsd,
      latencyMs: 0,
      errorCode: "baseten_fallback",
    }).catch(() => {});
    return {
      visualType: toVisualTypeEnum(fallback.object.visualType),
      description: fallback.object.description,
      confidence: fallback.object.confidence,
      fallbackUsed: true,
    };
  }
}

export const visualAnalysisProcess = inngest.createFunction(
  {
    name: "Visual Course Page Analysis",
    id: "visual-analysis/process",
    triggers: {
      event: "note/uploaded",
    },
    // One page's failure must not strand the whole note: per-page work is
    // isolated in try/catch below, and pages with no COMPLETED analysis are
    // retried on the next run. Job-level retries cover transient fetch
    // failures (UploadThing signed URL, Blob, model transport).
    retries: 2,
    concurrency: {
      limit: 2,
      key: "visual-analysis",
    },
  },
  async ({ event }) => {
    const { noteId } = event.data;
    console.log(`[Visual Analysis] Starting for note: ${noteId}`);

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error(`[Visual Analysis] Note not found: ${noteId}`);
    }

    // Only PDFs have pages to scan. Images and Word notes skip the
    // pipeline with a successful result instead of failing on fetch.
    if (note.fileType !== "PDF") {
      console.log(
        `[Visual Analysis] Skipping non-PDF note ${noteId} (${note.fileType})`,
      );
      return {
        success: true,
        noteId,
        skipped: true as const,
        scanned: 0,
        visual: 0,
        analysed: 0,
        failed: 0,
      };
    }

    // Idempotent re-scan: skip only pages that already have a COMPLETED
    // analysis. Pages whose only rows are FAILED (dead Baseten key, transient
    // outage) are retried, so a chat-triggered requeue actually heals them.
    const existingPages = await prisma.page.findMany({
      where: { noteId },
      select: {
        pageNumber: true,
        analyses: { select: { status: true } },
      },
    });
    const completedPageNumbers = new Set(
      existingPages
        .filter((page) => page.analyses.some((a) => a.status === "COMPLETED"))
        .map((page) => page.pageNumber),
    );

    if (!note.uploadthingKey) {
      throw new Error(`[Visual Analysis] Note has no file: ${noteId}`);
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await fetchNotePdfBytes(note.uploadthingKey);
    } catch (error) {
      console.error(
        `[Visual Analysis] Failed to fetch PDF for note ${noteId}:`,
        error,
      );
      throw new Error(`Could not fetch the note PDF for ${noteId}`);
    }

    let scanResults: PageScanResult[];
    try {
      scanResults = await scanPages(pdfBytes);
    } catch (error) {
      console.error(`[Visual Analysis] Scan failed for note ${noteId}:`, error);
      throw new Error(`Page scan failed for note ${noteId}`);
    }

    // Per-page text for grounding ("which page covers X?"). Best effort: a
    // text failure never blocks the visual path, pages just ground on visuals.
    let pageTexts: string[] = [];
    try {
      pageTexts = await extractPageTextsFromBytes(pdfBytes);
    } catch (error) {
      console.warn(
        `[Visual Analysis] Page text extraction failed for note ${noteId}:`,
        error instanceof Error ? error.message : error,
      );
    }

    // The parent does fast work only (fetch, render, store, text rows) and
    // fans each visual page out to its own short-lived run below. A 44-page
    // note of slow model calls would outlive one serverless invocation;
    // one event per page keeps every invocation well inside the timeout.
    let queued = 0;
    let visualCount = 0;
    let textCount = 0;
    const pageEvents: Array<{
      name: "note/analyze-page";
      data: {
        noteId: string;
        pageNumber: number;
        excerpt: string;
      };
    }> = [];

    for (const result of scanResults) {
      if (completedPageNumbers.has(result.pageNumber)) {
        continue;
      }

      if (result.hasVisual) visualCount += 1;
      const excerpt = pageTextExcerpt(
        pageTexts[result.pageNumber - 1] ?? "",
        PAGE_TEXT_EXCERPT_CHARS,
      );

      // Upsert on the unique note plus page number pair. A crashed run can
      // leave an unfinished row behind; recreating it would violate the
      // constraint, so reuse the row and refresh only the scan verdict.
      const page = await prisma.page.upsert({
        where: { noteId_pageNumber: { noteId, pageNumber: result.pageNumber } },
        create: {
          noteId,
          pageNumber: result.pageNumber,
          hasVisual: result.hasVisual,
          analysedAt: null,
        },
        update: { hasVisual: result.hasVisual },
      });

      // A page that failed to render is recorded as failed here: no worker
      // could render the same bytes any better.
      if (result.scanError || !result.pageImageBuffer) {
        console.error(
          `[Visual Analysis] Render failed page ${result.pageNumber}:`,
          result.scanError ?? "empty image",
        );
        await prisma.visualAnalysis.create({
          data: {
            pageId: page.id,
            visualType: "OTHER",
            description: `Page ${result.pageNumber} could not be rendered for analysis.`,
            confidence: null,
            status: "FAILED",
          },
        });
        await prisma.page.update({
          where: { id: page.id },
          data: { analysedAt: new Date() },
        });
        continue;
      }

      // Text-only pages get a COMPLETED text row here so "which page covers
      // X?" works without any model call or follow-up event.
      if (!result.hasVisual) {
        const textDescription =
          excerpt.length > 0
            ? `Page ${result.pageNumber} text:\n${excerpt}`
            : `Page ${result.pageNumber} has no extractable text.`;
        await prisma.visualAnalysis.create({
          data: {
            pageId: page.id,
            visualType: "OTHER",
            description: textDescription,
            confidence: null,
            status: "COMPLETED",
          },
        });
        await prisma.page.update({
          where: { id: page.id },
          data: { analysedAt: new Date() },
        });
        textCount += 1;
        continue;
      }

      // Best-effort thumbnail for the note art strip. A Blob failure must
      // not block grounding: the worker analyses from bytes when no URL
      // was stored.
      try {
        const pageImageUrl = await storePageImage(
          noteId,
          result.pageNumber,
          result.pageImageBuffer,
        );
        await prisma.page.update({
          where: { id: page.id },
          data: { pageImageUrl },
        });
      } catch (error) {
        console.warn(
          `[Visual Analysis] Thumbnail store failed page ${result.pageNumber}, analysis proceeds without it:`,
          error instanceof Error ? error.message : error,
        );
      }

      pageEvents.push({
        name: "note/analyze-page",
        data: { noteId, pageNumber: result.pageNumber, excerpt },
      });
      queued += 1;
    }

    if (pageEvents.length > 0) {
      await inngest.send(pageEvents);
    }

    console.log(
      `[Visual Analysis] Note ${noteId}: scanned=${scanResults.length} visual=${visualCount} text=${textCount} queued=${queued}`,
    );

    return {
      success: true,
      noteId,
      scanned: scanResults.length,
      visual: visualCount,
      text: textCount,
      queued,
    };
  },
);

/** One visual page, one short-lived run. Retries heal transient model or
 *  fetch failures per page instead of replaying the whole note. */
export const visualPageAnalyze = inngest.createFunction(
  {
    name: "Visual Page Analysis",
    id: "visual-analysis/analyze-page",
    triggers: {
      event: "note/analyze-page",
    },
    retries: 3,
    concurrency: {
      limit: 2,
      key: "visual-analysis",
    },
  },
  async ({ event }) => {
    const { noteId, pageNumber, excerpt } = event.data as {
      noteId: string;
      pageNumber: number;
      excerpt: string;
    };
    console.log(`[Visual Analysis] Page ${pageNumber} for note: ${noteId}`);

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });
    if (!note) {
      throw new Error(`[Visual Analysis] Note not found: ${noteId}`);
    }
    const page = await prisma.page.findFirst({
      where: { noteId, pageNumber },
      select: {
        id: true,
        pageImageUrl: true,
        analyses: { select: { status: true } },
      },
    });
    if (!page) {
      throw new Error(
        `[Visual Analysis] Page ${pageNumber} gone for note: ${noteId}`,
      );
    }
    if (page.analyses.some((a) => a.status === "COMPLETED")) {
      return { success: true, noteId, pageNumber, skipped: true as const };
    }
    if (!note.uploadthingKey) {
      throw new Error(`[Visual Analysis] Note has no file: ${noteId}`);
    }

    let imageBuffer: Buffer;
    try {
      const pdfBytes = await fetchNotePdfBytes(note.uploadthingKey);
      ({ imageBuffer } = await renderSinglePageImage(pdfBytes, pageNumber));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(
        `[Visual Analysis] Render failed page ${pageNumber}:`,
        reason,
      );
      await prisma.visualAnalysis.create({
        data: {
          pageId: page.id,
          visualType: "OTHER",
          description:
            `Page ${pageNumber} could not be rendered for analysis: ${reason}`.slice(
              0,
              500,
            ),
          confidence: null,
          status: "FAILED",
        },
      });
      await prisma.page.update({
        where: { id: page.id },
        data: { analysedAt: new Date() },
      });
      return { success: false, noteId, pageNumber, failed: true as const };
    }

    // Prefer the stored thumbnail URL; fall back to an inline data URL so a
    // Blob outage never blocks grounding.
    let imageRef = page.pageImageUrl;
    if (!imageRef) {
      try {
        imageRef = await storePageImage(noteId, pageNumber, imageBuffer);
        await prisma.page.update({
          where: { id: page.id },
          data: { pageImageUrl: imageRef },
        });
      } catch (error) {
        console.warn(
          `[Visual Analysis] Thumbnail store failed page ${pageNumber}, analysing inline:`,
          error instanceof Error ? error.message : error,
        );
        imageRef = `data:image/png;base64,${imageBuffer.toString("base64")}`;
      }
    }

    try {
      const analysed = await analyseVisualPage(imageRef, pageNumber);
      const description =
        excerpt.length > 0
          ? `${analysed.description}\nText on page: ${excerpt}`.slice(0, 2000)
          : analysed.description;
      await prisma.visualAnalysis.create({
        data: {
          pageId: page.id,
          visualType: analysed.visualType,
          description,
          confidence: analysed.confidence,
          basetenCostXaf: analysed.fallbackUsed ? null : MUSE_COST_PER_CALL_XAF,
          status: "COMPLETED",
        },
      });
      await logUsage({
        userId: note.userId ?? null,
        task: "visual_analysis",
        modelId: analysed.fallbackUsed
          ? OPEN_WEIGHT_CHAIN[0]
          : "meta-models/muse-spark-open-1026",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: analysed.fallbackUsed
          ? 0
          : MUSE_COST_PER_CALL_XAF / USD_TO_XAF_RATE,
        usdToXafRate: USD_TO_XAF_RATE,
        latencyMs: 0,
        errorCode: analysed.fallbackUsed ? "baseten_fallback" : null,
      }).catch(() => {});
      await prisma.page.update({
        where: { id: page.id },
        data: { analysedAt: new Date() },
      });
      return {
        success: true,
        noteId,
        pageNumber,
        fallbackUsed: analysed.fallbackUsed,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(
        `[Visual Analysis] Model failed page ${pageNumber} (Baseten and fallback):`,
        reason,
      );
      await prisma.visualAnalysis.create({
        data: {
          pageId: page.id,
          visualType: "OTHER",
          description:
            `No model could analyse page ${pageNumber}: ${reason}`.slice(
              0,
              500,
            ),
          confidence: null,
          status: "FAILED",
        },
      });
      await logUsage({
        userId: note.userId ?? null,
        task: "visual_analysis",
        modelId: "none",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: 0,
        usdToXafRate: USD_TO_XAF_RATE,
        latencyMs: 0,
        errorCode: "visual_unusable",
      }).catch(() => {});
      await prisma.page.update({
        where: { id: page.id },
        data: { analysedAt: new Date() },
      });
      throw new Error(`Visual analysis failed page ${pageNumber}: ${reason}`);
    }
  },
);
