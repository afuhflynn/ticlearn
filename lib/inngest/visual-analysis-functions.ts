import { put } from "@vercel/blob";
import { generateObject, generateText } from "ai";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { chainModel, chainMuse, OPEN_WEIGHT_CHAIN } from "@/lib/ai/chain";
import {
  OCR_RENDER_LONG_EDGE_PX,
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

/** Parse one Baseten answer: strip code fences, parse JSON, validate shape.
 *  Throws on anything unusable so the caller falls through to the fallback. */
export function parseVisualAnswer(raw: string): {
  visualType: "DIAGRAM" | "CHART" | "TABLE" | "ILLUSTRATION" | "OTHER";
  description: string;
  confidence: number;
} {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const parsed = visualAnalysisSchema.parse(JSON.parse(cleaned));
  return {
    visualType: toVisualTypeEnum(parsed.visualType),
    description: parsed.description,
    confidence: parsed.confidence,
  };
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
    // Muse Spark Open does not support structured outputs (no response_format
    // on this model, per Baseten docs), so ask for plain text and parse the
    // JSON the prompt already demands. A parse failure falls through to the
    // OpenRouter fallback below like any transport error.
    const { text: raw } = await generateText({
      model: chainMuse("meta-models/muse-spark-open-1026"),
      messages,
      temperature: settings.heat,
      maxOutputTokens: settings.cap,
      abortSignal: AbortSignal.timeout(120_000),
    });
    return { ...parseVisualAnswer(raw), fallbackUsed: false };
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
  async ({ event, step }) => {
    const { noteId } = event.data;
    console.log(`[Visual Analysis] Starting for note: ${noteId}`);

    const note = await step.run("load-note", async () => {
      return prisma.note.findUnique({
        where: { id: noteId },
      });
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
    // The list is memoized in its own step, so a retry reuses the same page
    // set instead of rescanning a note that changed underneath the run.
    const completedPageNumbers = await step.run(
      "load-completed-pages",
      async () => {
        const existingPages = await prisma.page.findMany({
          where: { noteId },
          select: {
            pageNumber: true,
            analyses: { select: { status: true } },
          },
        });
        return existingPages
          .filter((page) => page.analyses.some((a) => a.status === "COMPLETED"))
          .map((page) => page.pageNumber);
      },
    );

    if (!note.uploadthingKey) {
      throw new Error(`[Visual Analysis] Note has no file: ${noteId}`);
    }

    // Fetch, render, and text-extract in one step. Only the small serializable
    // summaries cross the checkpoint: the page image buffers stay local, and
    // the worker below re-renders its own page from the stored PDF.
    const scannedPages = await step.run("scan-pdf", async () => {
      let pdfBytes: Uint8Array;
      try {
        pdfBytes = await fetchNotePdfBytes(note.uploadthingKey as string);
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
        console.error(
          `[Visual Analysis] Scan failed for note ${noteId}:`,
          error,
        );
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

      return scanResults
        .filter((result) => !completedPageNumbers.includes(result.pageNumber))
        .map((result) => ({
          pageNumber: result.pageNumber,
          hasVisual: result.hasVisual,
          renderFailed: Boolean(result.scanError || !result.pageImageBuffer),
          excerpt: pageTextExcerpt(
            pageTexts[result.pageNumber - 1] ?? "",
            PAGE_TEXT_EXCERPT_CHARS,
          ),
        }));
    });

    // The parent does fast work only (fetch, render, store, text rows) and
    // fans each visual page out to its own short-lived run below. A 44-page
    // note of slow model calls would outlive one serverless invocation;
    // one event per page keeps every invocation well inside the timeout.
    const stored = await step.run("store-pages", async () => {
      let visualCount = 0;
      let textCount = 0;
      let failedCount = 0;

      for (const scanned of scannedPages) {
        // Upsert on the unique note plus page number pair. A crashed run can
        // leave an unfinished row behind; recreating it would violate the
        // constraint, so reuse the row and refresh only the scan verdict.
        const page = await prisma.page.upsert({
          where: {
            noteId_pageNumber: { noteId, pageNumber: scanned.pageNumber },
          },
          create: {
            noteId,
            pageNumber: scanned.pageNumber,
            hasVisual: scanned.hasVisual,
            analysedAt: null,
          },
          update: { hasVisual: scanned.hasVisual },
        });

        // A page that failed to render is recorded as failed here: no worker
        // could render the same bytes any better.
        if (scanned.renderFailed) {
          console.error(
            `[Visual Analysis] Render failed page ${scanned.pageNumber}: scan error`,
          );
          await prisma.visualAnalysis.create({
            data: {
              pageId: page.id,
              visualType: "OTHER",
              description: `Page ${scanned.pageNumber} could not be rendered for analysis.`,
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

        // Text-only pages with embedded text get a COMPLETED text row here
        // so "which page covers X?" works without any model call or
        // follow-up event. Pages with no text at all (scanned images, odd
        // encodings) go to the worker below, which OCRs the rendered page.
        if (!scanned.hasVisual && scanned.excerpt.length > 0) {
          const textDescription = `Page ${scanned.pageNumber} text:\n${scanned.excerpt}`;
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

        if (scanned.hasVisual) visualCount += 1;
      }

      return { visualCount, textCount, failedCount };
    });

    // Every page without usable text goes to a worker: visual pages for the
    // model, text-empty pages for OCR of the rendered image. Pages already
    // answered above never leave this run.
    const queued = scannedPages.filter(
      (p) => !p.renderFailed && (p.hasVisual || p.excerpt.length === 0),
    );
    if (queued.length > 0) {
      // A checkpointed fan-out: if the run retries after this point, the
      // events are not sent twice.
      await step.sendEvent(
        "fan-out-pages",
        queued.map((p) => ({
          name: "note/analyze-page",
          data: { noteId, pageNumber: p.pageNumber, excerpt: p.excerpt },
        })),
      );
    }

    console.log(
      `[Visual Analysis] Note ${noteId}: scanned=${scannedPages.length} visual=${stored.visualCount} text=${stored.textCount} failed=${stored.failedCount} queued=${queued.length}`,
    );

    return {
      success: true,
      noteId,
      scanned: scannedPages.length,
      visual: stored.visualCount,
      text: stored.textCount,
      failed: stored.failedCount,
      queued: queued.length,
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
  async ({ event, step }) => {
    const { noteId, pageNumber, excerpt } = event.data as {
      noteId: string;
      pageNumber: number;
      excerpt: string;
    };
    console.log(`[Visual Analysis] Page ${pageNumber} for note: ${noteId}`);

    const loaded = await step.run("load-page", async () => {
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
      return {
        userId: note.userId,
        uploadthingKey: note.uploadthingKey,
        pageId: page.id,
        pageImageUrl: page.pageImageUrl,
        completed: page.analyses.some((a) => a.status === "COMPLETED"),
      };
    });
    if (loaded.completed) {
      return { success: true, noteId, pageNumber, skipped: true as const };
    }
    if (!loaded.uploadthingKey) {
      throw new Error(`[Visual Analysis] Note has no file: ${noteId}`);
    }

    const rendered = await step.run("render-page", async () => {
      const pdfBytes = await fetchNotePdfBytes(loaded.uploadthingKey as string);
      try {
        const { imageBuffer, hasVisual } = await renderSinglePageImage(
          pdfBytes,
          pageNumber,
        );
        // Best-effort thumbnail for the note art strip. A Blob failure must
        // not block grounding: analysis below falls back to inline bytes.
        let imageUrl = loaded.pageImageUrl;
        if (!imageUrl) {
          try {
            imageUrl = await storePageImage(noteId, pageNumber, imageBuffer);
            await prisma.page.update({
              where: { id: loaded.pageId },
              data: { pageImageUrl: imageUrl },
            });
          } catch (error) {
            console.warn(
              `[Visual Analysis] Thumbnail store failed page ${pageNumber}, analysis proceeds inline:`,
              error instanceof Error ? error.message : error,
            );
            imageUrl = null;
          }
        }
        return {
          imageRef:
            imageUrl ??
            `data:image/png;base64,${imageBuffer.toString("base64")}`,
          imageBytes: imageBuffer.toString("base64"),
          hasVisual,
          renderError: null as string | null,
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          `[Visual Analysis] Render failed page ${pageNumber}:`,
          reason,
        );
        return {
          imageRef: null as string | null,
          imageBytes: null as string | null,
          hasVisual: false,
          renderError: reason,
        };
      }
    });
    if (!rendered.imageRef) {
      await step.run("record-render-failure", async () => {
        await prisma.visualAnalysis.create({
          data: {
            pageId: loaded.pageId,
            visualType: "OTHER",
            description:
              `Page ${pageNumber} could not be rendered for analysis: ${rendered.renderError}`.slice(
                0,
                500,
              ),
            confidence: null,
            status: "FAILED",
          },
        });
        await prisma.page.update({
          where: { id: loaded.pageId },
          data: { analysedAt: new Date() },
        });
        return { failed: true as const };
      });
      return { success: false, noteId, pageNumber, failed: true as const };
    }

    // Scanned-image pages carry no embedded text. OCR a high resolution
    // render so they still ground by words; skipped entirely when pdfjs
    // already read the page. Best effort with a hard cap: a hung OCR must
    // not strand the page past this step.
    let pageText = excerpt;
    if (!rendered.renderError && pageText.length === 0) {
      const ocr = await step.run("ocr-page", async () => {
        try {
          const { default: Tesseract } = await import("tesseract.js");
          const pdfBytes = await fetchNotePdfBytes(
            loaded.uploadthingKey as string,
          );
          const { imageBuffer } = await renderSinglePageImage(
            pdfBytes,
            pageNumber,
            OCR_RENDER_LONG_EDGE_PX,
          );
          const done = Tesseract.recognize(imageBuffer, "eng", {
            // Serverless filesystems are often read only outside tmp, so pin
            // the traineddata cache somewhere writable instead of failing
            // the whole recognition when the default cache path is not.
            cachePath: "/tmp/tesseract",
            logger: () => {},
          });
          const timedOut = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 90_000),
          );
          const data = await Promise.race([done, timedOut]);
          if (!data) {
            console.warn(
              `[Visual Analysis] OCR timed out page ${pageNumber}, continuing without text`,
            );
            return { text: "" };
          }
          return { text: pageTextExcerpt(data.data?.text ?? "") };
        } catch (error) {
          console.warn(
            `[Visual Analysis] OCR failed page ${pageNumber}, continuing without text:`,
            error instanceof Error ? error.message : error,
          );
          return { text: "" };
        }
      });
      pageText = ocr.text;
    }

    // A text-looking page that yielded words (embedded or OCR read) needs no
    // model: store the text row and finish here. A page with no words at all
    // goes to the vision model below, which transcribes what it sees instead
    // of leaving a contentless placeholder row.
    if (!rendered.hasVisual && pageText.length > 0) {
      return step.run("record-text-page", async () => {
        await prisma.visualAnalysis.create({
          data: {
            pageId: loaded.pageId,
            visualType: "OTHER",
            description: `Page ${pageNumber} text:\n${pageText}`,
            confidence: null,
            status: "COMPLETED",
          },
        });
        await prisma.page.update({
          where: { id: loaded.pageId },
          data: { analysedAt: new Date() },
        });
        return {
          success: true,
          noteId,
          pageNumber,
          text: true,
        };
      });
    }

    const analysed = await step.run("analyze-page", async () => {
      try {
        const result = await analyseVisualPage(
          rendered.imageRef as string,
          pageNumber,
        );
        return { ok: true as const, ...result };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          `[Visual Analysis] Model failed page ${pageNumber} (Baseten and fallback):`,
          reason,
        );
        return { ok: false as const, reason };
      }
    });

    return step.run("record-analysis", async () => {
      if (!analysed.ok) {
        await prisma.visualAnalysis.create({
          data: {
            pageId: loaded.pageId,
            visualType: "OTHER",
            description:
              `No model could analyse page ${pageNumber}: ${analysed.reason}`.slice(
                0,
                500,
              ),
            confidence: null,
            status: "FAILED",
          },
        });
        await logUsage({
          userId: loaded.userId ?? null,
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
          where: { id: loaded.pageId },
          data: { analysedAt: new Date() },
        });
        return { success: false, noteId, pageNumber, failed: true as const };
      }
      const description =
        pageText.length > 0
          ? `${analysed.description}\nText on page: ${pageText}`.slice(0, 2000)
          : analysed.description;
      await prisma.visualAnalysis.create({
        data: {
          pageId: loaded.pageId,
          visualType: analysed.visualType,
          description,
          confidence: analysed.confidence,
          basetenCostXaf: analysed.fallbackUsed ? null : MUSE_COST_PER_CALL_XAF,
          status: "COMPLETED",
        },
      });
      // Log Baseten cost as promotional credit, never a student debit (AC-5).
      await logUsage({
        userId: loaded.userId ?? null,
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
        where: { id: loaded.pageId },
        data: { analysedAt: new Date() },
      });
      return {
        success: true,
        noteId,
        pageNumber,
        fallbackUsed: analysed.fallbackUsed,
      };
    });
  },
);
