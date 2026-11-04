import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import {
  extractPageTextsFromBytes,
  pageTextExcerpt,
} from "@/lib/ai/page-texts";

function buildPdf(texts: string[]): Promise<Uint8Array> {
  const doc = new PDFDocument();
  const chunks: Array<Buffer> = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const ended = new Promise<void>((resolve) => doc.on("end", resolve));
  texts.forEach((text, index) => {
    if (index > 0) doc.addPage();
    doc.fontSize(14).text(text, 50, 50);
  });
  doc.end();
  return ended.then(() => Uint8Array.from(Buffer.concat(chunks)));
}

describe("page texts", () => {
  it("extracts text per page in order", async () => {
    const pdf = await buildPdf([
      "Applications of Optical Fibers live here",
      "Second page about electromagnetic waves",
    ]);
    const pages = await extractPageTextsFromBytes(pdf);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain("Optical Fibers");
    expect(pages[1]).toContain("electromagnetic");
  });

  it("caps excerpts for grounding", () => {
    expect(pageTextExcerpt(`  ${"x".repeat(2000)}  `)).toHaveLength(1200);
    expect(pageTextExcerpt("  hello  ")).toBe("hello");
  });
});
