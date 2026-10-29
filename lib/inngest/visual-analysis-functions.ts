import { put } from "@vercel/blob";
import { generateObject } from "ai";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { chainMuse } from "@/lib/ai/chain";
import {
  type PageScanResult,
  scanPages,
  toVisualTypeEnum,
} from "@/lib/ai/page-scan";
import { MUSE_COST_PER_CALL_XAF } from "@/lib/ai/pricing";
import { logUsage } from "@/lib/ai/usage";
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

/** Analyse one visual page with Baseten Muse Spark Open. */
async function analyseVisualPage(
  pageImageUrl: string,
  pageNumber: number,
): Promise<{
  visualType: "DIAGRAM" | "CHART" | "TABLE" | "ILLUSTRATION" | "OTHER";
  description: string;
  confidence: number;
}> {
  const { text: prompt, settings } = await getPrompt(
    "ingest",
    "visual_analysis",
    {
      pageNumber: String(pageNumber),
    },
  );
  const result = await generateObject({
    model: chainMuse("meta-models/muse-spark-open-1026"),
    schema: visualAnalysisSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: pageImageUrl },
        ],
      },
    ],
    temperature: settings.heat,
    maxOutputTokens: settings.cap,
  });
  return {
    visualType: toVisualTypeEnum(result.object.visualType),
    description: result.object.description,
    confidence: result.object.confidence,
  };
}

export const visualAnalysisProcess = inngest.createFunction(
  {
    name: "Visual Course Page Analysis",
    id: "visual-analysis/process",
    triggers: {
      event: "note/uploaded",
    },
    // One page's failure must not strand the whole note: retries are disabled
    // so a failed page stays failed and the rest complete.
    retries: 0,
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

    // Idempotent re-scan: only process pages that have not been analysed yet.
    const existingPages = await prisma.page.findMany({
      where: { noteId },
      select: { pageNumber: true, analysedAt: true },
    });
    const analysedPageNumbers = new Set(
      existingPages
        .filter((page) => page.analysedAt !== null)
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

    let scanned = 0;
    let visualCount = 0;
    let analysedCount = 0;
    let failedCount = 0;

    for (const result of scanResults) {
      if (analysedPageNumbers.has(result.pageNumber)) {
        continue;
      }

      scanned += 1;
      if (result.hasVisual) visualCount += 1;

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

      // A page that failed to render is recorded as failed and skipped.
      const imageBuffer = result.pageImageBuffer;
      if (result.scanError || !imageBuffer) {
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
        failedCount += 1;
        continue;
      }

      // Only visual pages go to Baseten (AC-4, AC-8).
      if (!result.hasVisual) {
        await prisma.page.update({
          where: { id: page.id },
          data: { analysedAt: new Date() },
        });
        continue;
      }

      let pageImageUrl: string | null = null;
      try {
        pageImageUrl = await storePageImage(
          noteId,
          result.pageNumber,
          imageBuffer,
        );
      } catch (error) {
        console.error(
          `[Visual Analysis] Image store failed page ${result.pageNumber}:`,
          error,
        );
        await prisma.visualAnalysis.create({
          data: {
            pageId: page.id,
            visualType: "OTHER",
            description: "Image upload failed; page could not be analysed.",
            confidence: null,
            status: "FAILED",
          },
        });
        await prisma.page.update({
          where: { id: page.id },
          data: { analysedAt: new Date() },
        });
        failedCount += 1;
        continue;
      }

      let visualType: "DIAGRAM" | "CHART" | "TABLE" | "ILLUSTRATION" | "OTHER";
      let description: string;
      let confidence: number | null;
      let pageFailed = false;
      try {
        const analysed = await analyseVisualPage(
          pageImageUrl,
          result.pageNumber,
        );
        visualType = analysed.visualType;
        description = analysed.description;
        confidence = analysed.confidence;
        analysedCount += 1;
      } catch (error) {
        console.error(
          `[Visual Analysis] Baseten failed page ${result.pageNumber}:`,
          error,
        );
        visualType = "OTHER";
        description = "Baseten returned an unusable result for this page.";
        confidence = null;
        pageFailed = true;
        failedCount += 1;
      }

      await prisma.visualAnalysis.create({
        data: {
          pageId: page.id,
          visualType,
          description,
          confidence,
          basetenCostXaf: pageFailed ? null : MUSE_COST_PER_CALL_XAF,
          status: pageFailed ? "FAILED" : "COMPLETED",
        },
      });

      // Log Baseten cost as promotional credit, never a student debit (AC-5).
      await logUsage({
        userId: note.userId ?? null,
        task: "visual_analysis",
        modelId: "meta-models/muse-spark-open-1026",
        promptTokens: 0,
        completionTokens: 0,
        costUsd: MUSE_COST_PER_CALL_XAF / USD_TO_XAF_RATE,
        usdToXafRate: USD_TO_XAF_RATE,
        latencyMs: 0,
        errorCode: pageFailed ? "baseten_unusable" : null,
      }).catch(() => {});

      await prisma.page.update({
        where: { id: page.id },
        data: { pageImageUrl, analysedAt: new Date() },
      });
    }

    console.log(
      `[Visual Analysis] Note ${noteId}: scanned=${scanned} visual=${visualCount} analysed=${analysedCount} failed=${failedCount}`,
    );

    return {
      success: true,
      noteId,
      scanned,
      visual: visualCount,
      analysed: analysedCount,
      failed: failedCount,
    };
  },
);
