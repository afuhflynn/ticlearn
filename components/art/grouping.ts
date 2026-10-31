import type { DrawnArt, ScanArt } from "@/hooks/useArtifacts";

export type PageSection = {
  pageNumber: number;
  scan: ScanArt | null;
  drawn: DrawnArt[];
};

export const NOTE_PAGE_SECTIONS_CAP = 12;

/** Groups scans plus drawn art into one section per page in reading order,
 *  so thumbnails have a real anchor to scroll to and each page keeps its
 *  own drawn art underneath. Drawn art whose page has no section (no scan,
 *  or beyond the cap) lands in unassigned so nothing disappears. */
export function groupArtByPage(
  scans: ScanArt[],
  drawn: DrawnArt[],
  maxPages = NOTE_PAGE_SECTIONS_CAP,
): { sections: PageSection[]; unassigned: DrawnArt[]; overflow: number } {
  const pageNumbers = [...new Set(scans.map((s) => s.pageNumber))].sort(
    (a, b) => a - b,
  );
  const kept = pageNumbers.slice(0, maxPages);
  const scanByPage = new Map(scans.map((s) => [s.pageNumber, s]));
  const sections: PageSection[] = kept.map((pageNumber) => ({
    pageNumber,
    scan: scanByPage.get(pageNumber) ?? null,
    drawn: [],
  }));
  const sectionByPage = new Map(sections.map((s) => [s.pageNumber, s]));
  const unassigned: DrawnArt[] = [];
  for (const d of drawn) {
    const section =
      d.sourcePage != null ? sectionByPage.get(d.sourcePage) : undefined;
    if (section) section.drawn.push(d);
    else unassigned.push(d);
  }
  return {
    sections,
    unassigned,
    overflow: Math.max(0, pageNumbers.length - kept.length),
  };
}

/** Orders scans to match the cited page order (quiz sourcePages, chat page
 *  mentions), dropping cited pages with no scan. A plain filter keeps the
 *  read order, which is page number order, not the order the student saw. */
export function orderScansByPages(
  scans: ScanArt[],
  pageNumbers: number[],
): ScanArt[] {
  const scanByPage = new Map(scans.map((s) => [s.pageNumber, s]));
  const ordered: ScanArt[] = [];
  for (const pageNumber of pageNumbers) {
    const scan = scanByPage.get(pageNumber);
    if (scan) ordered.push(scan);
  }
  return ordered;
}
