import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { scanPages } from "@/lib/ai/page-scan";

async function buildPdf(
  pages: Array<{ visual: boolean }>,
): Promise<Uint8Array> {
  const doc = new PDFDocument();
  const chunks: Array<Buffer> = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const ended = new Promise<void>((resolve) => doc.on("end", resolve));
  for (const [index, page] of pages.entries()) {
    if (index > 0) doc.addPage();
    if (page.visual) {
      doc.fontSize(20).text("visual page", 50, 50);
      doc.rect(50, 100, 500, 400).fill("blue");
    } else {
      doc.fontSize(20).text("text only paragraph of words here", 50, 50);
    }
  }
  doc.end();
  await ended;
  const buffer = Buffer.concat(chunks);
  return Uint8Array.from(buffer);
}

describe("page scan (covers: AC-1, AC-2, AC-4, AC-8)", () => {
  it("flags pages with diagrams as visual and skips text-only pages", async () => {
    const pdf = await buildPdf([
      { visual: true },
      { visual: false },
      { visual: true },
    ]);

    const results = await scanPages(pdf);

    expect(results).toHaveLength(3);
    expect(results[0].pageNumber).toBe(1);
    expect(results[0].hasVisual).toBe(true);
    expect(results[0].scanError).toBeNull();
    expect(results[0].pageImageBuffer).toBeInstanceOf(Buffer);
    expect(results[0].pageImageBuffer?.length).toBeGreaterThan(0);
    expect(results[1].pageNumber).toBe(2);
    expect(results[1].hasVisual).toBe(false);
    expect(results[1].scanError).toBeNull();
    expect(results[2].pageNumber).toBe(3);
    expect(results[2].hasVisual).toBe(true);
    expect(results[2].scanError).toBeNull();
  });

  it("renders every page once so text pages are never sent to Baseten", async () => {
    const pdf = await buildPdf([{ visual: false }, { visual: false }]);

    const results = await scanPages(pdf);

    expect(results.every((page) => page.hasVisual === false)).toBe(true);
    expect(
      results.every(
        (page) =>
          page.scanError === null &&
          page.pageImageBuffer instanceof Buffer &&
          page.pageImageBuffer.length > 0,
      ),
    ).toBe(true);
  });

  it("rejects bytes that are not a PDF at all (covers: AC-6)", async () => {
    await expect(scanPages(new Uint8Array([0, 1, 2, 3]))).rejects.toThrow();
  });
});
