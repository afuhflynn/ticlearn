import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

/** Max characters of page text stored per page for grounding. */
export const PAGE_TEXT_EXCERPT_CHARS = 1200;

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replaceAll(String.fromCharCode(0), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract raw text per PDF page, in order. Never throws for an empty or
 * unreadable page: such a page resolves to "". Rejects only when the bytes
 * are not a readable PDF at all.
 */
export async function extractPageTextsFromBytes(
  pdfBytes: Uint8Array,
): Promise<string[]> {
  const loadingTask = getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: VerbosityLevel.ERRORS,
  });
  const pdf = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      try {
        const page = await pdf.getPage(pageNumber);
        try {
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          pages.push(normalize(text));
        } finally {
          page.cleanup();
        }
      } catch (error) {
        console.warn(
          `[page-texts] Text extraction failed for page ${pageNumber}, keeping it empty:`,
          error instanceof Error ? error.message : error,
        );
        pages.push("");
      }
    }
    return pages;
  } finally {
    await pdf.destroy();
    await loadingTask.destroy();
  }
}

/** First N chars of a page used for grounding and "which page" answers. */
export function pageTextExcerpt(
  text: string,
  maxChars: number = PAGE_TEXT_EXCERPT_CHARS,
): string {
  return text.trim().slice(0, maxChars);
}
