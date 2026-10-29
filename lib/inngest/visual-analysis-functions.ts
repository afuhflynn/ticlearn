import { put } from "@vercel/blob";
import { generateObject } from "ai";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { chainMuse } from "@/lib/ai/chain";
import { type PageScanResult, scanPages } from "@/lib/ai/page-scan";
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
): Promise<{ visualType: string; description: string; confidence: number }> {
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
    visualType: result.object.visualType,
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
      console.error(`[Visual Analysis] Note not found: ${noteId}`);
      return { success: false, error: "Note not found" };
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
      console.error(`[Visual Analysis] Note has no file: ${noteId}`);
      return { success: false, error: "Note has no file to scan" };
    }

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await fetchNotePdfBytes(note.uploadthingKey);
    } catch (error) {
      console.error(
        `[Visual Analysis] Failed to fetch PDF for note ${noteId}:`,
        error,
      );
      return { success: false, error: "Could not fetch the note PDF" };
    }

    let scanResults: PageScanResult[];
    try {
      scanResults = await scanPages(pdfBytes);
    } catch (error) {
      console.error(`[Visual Analysis] Scan failed for note ${noteId}:`, error);
      return { success: false, error: "Page scan failed" };
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

      // Create the page row for every scanned page.
      const page = await prisma.page.create({
        data: {
          noteId,
          pageNumber: result.pageNumber,
          hasVisual: result.hasVisual,
          analysedAt: null,
        },
      });

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
          result.pageImageBuffer,
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

      let visualType: string;
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
          visualType: visualType as
            | "DIAGRAM"
            | "CHART"
            | "TABLE"
            | "ILLUSTRATION"
            | "OTHER",
          description,
          confidence,
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
        data: { analysedAt: new Date() },
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
