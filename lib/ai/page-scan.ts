import { createCanvas } from "@napi-rs/canvas";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * A page counts as visual when at least this share of its rendered pixels are
 * non-white. Catches image-based and vector-drawn diagrams, charts, tables and
 * illustrations alike at near-zero cost (no model call).
 */
export const VISUAL_PIXEL_RATIO_THRESHOLD = 0.15;

/** Long edge of the rendered page used for both the scan and the Baseten input. */
export const PAGE_RENDER_LONG_EDGE_PX = 1024;

export interface PageScanResult {
  pageNumber: number;
  hasVisual: boolean;
  pageImageBuffer: Buffer;
}

/** Render one already-opened PDF page to a PNG buffer and test it for visual content. */
async function scanPageFromPdf(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageScanResult> {
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1.0 });
    const scale =
      PAGE_RENDER_LONG_EDGE_PX / Math.max(viewport.width, viewport.height);
    const scaled = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.ceil(scaled.width),
      Math.ceil(scaled.height),
    );
    const context = canvas.getContext("2d");
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport: scaled,
    }).promise;

    const pageImageBuffer = Buffer.from(canvas.toBuffer("image/png"));
    const hasVisual = pageHasVisualContent(
      context,
      scaled.width,
      scaled.height,
    );

    return { pageNumber, hasVisual, pageImageBuffer };
  } finally {
    page.cleanup();
  }
}

/** True when at least VISUAL_PIXEL_RATIO_THRESHOLD of pixels are non-white. */
function pageHasVisualContent(
  context: unknown,
  width: number,
  height: number,
): boolean {
  const ctx = context as CanvasRenderingContext2D;
  const data = ctx.getImageData(0, 0, Math.ceil(width), Math.ceil(height)).data;
  let nonWhite = 0;
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 245 || g < 245 || b < 245) {
      nonWhite += 1;
    }
  }
  return total > 0 && nonWhite / total >= VISUAL_PIXEL_RATIO_THRESHOLD;
}

/** Scan every page of a PDF: open once, render each page once, test each for visual content. */
export async function scanPages(
  pdfBytes: Uint8Array,
): Promise<PageScanResult[]> {
  const loadingTask = getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: VerbosityLevel.ERRORS,
  });
  const pdf = await loadingTask.promise;
  try {
    const results: PageScanResult[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      results.push(await scanPageFromPdf(pdf, pageNumber));
    }
    return results;
  } finally {
    await pdf.destroy();
    await loadingTask.destroy();
  }
}
