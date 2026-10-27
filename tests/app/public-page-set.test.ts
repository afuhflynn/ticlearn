import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/seo";

/**
 * The public set is one list four places must agree on, from spec 0021 AC-1,
 * AC-4, AC-7 and AC-8: the page files under the public route groups, the
 * sitemap that publishes them, the honesty gate that fetches them, and the
 * shared helper that builds their metadata.
 *
 * The page files are read from disk rather than listed here, because a list
 * written in a test is the same stale list the gate already keeps. A new page
 * under `app/(marketing)` fails this suite until it is also in the sitemap and
 * the gate, which is the drift the verify pass found.
 */

const ROOT = process.cwd();
const PUBLIC_GROUPS = ["app/(marketing)", "app/(auth)"];
const GATE = "scripts/check-landing-honesty.mjs";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function pageFilesIn(group: string): string[] {
  const found: string[] = [];

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "page.tsx") {
        found.push(path.relative(ROOT, full).split(path.sep).join("/"));
      }
    }
  };

  walk(path.join(ROOT, group));
  return found;
}

/** `app/(marketing)/about/page.tsx` is `/about`, and route groups drop out. */
function routeOf(file: string): string {
  const segments = file
    .replace(/^app\//, "")
    .replace(/\/?page\.tsx$/, "")
    .split("/")
    .filter((segment) => segment.length > 0 && !segment.startsWith("("));

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

async function sitemapRoutes(): Promise<string[]> {
  const entries = await sitemap();
  return entries
    .map((entry) =>
      entry.url.startsWith(SITE_URL)
        ? entry.url.slice(SITE_URL.length) || "/"
        : entry.url,
    )
    .sort();
}

function gateRoutes(): string[] {
  const source = readSource(GATE);
  // An entry may span several lines (the pricing page carries an extra flag),
  // so the list is sliced out and every path inside it is read, rather than
  // matching entry shape by line.
  const start = source.indexOf("const PAGES");
  const end = source.indexOf("];", start);
  const block = start === -1 || end === -1 ? "" : source.slice(start, end);

  return Array.from(
    block.matchAll(/path: "([^"]+)"/g),
    (match) => match[1],
  ).sort();
}

const PUBLIC_PAGE_FILES = PUBLIC_GROUPS.flatMap(pageFilesIn).sort();
const PUBLIC_ROUTES = PUBLIC_PAGE_FILES.map(routeOf).sort();

describe("the public page set (AC-4)", () => {
  it("finds the pages under the two public route groups", () => {
    // A walker that silently found nothing would make every test below pass
    // on an empty comparison, so the starting point is asserted first.
    expect(PUBLIC_PAGE_FILES.length).toBeGreaterThanOrEqual(10);
  });

  it("has every public page in the sitemap", async () => {
    const published = await sitemapRoutes();

    for (const route of PUBLIC_ROUTES) {
      expect(published, `${route} is missing from the sitemap`).toContain(
        route,
      );
    }
  });

  it("publishes the public page set and nothing else", async () => {
    // Both directions matter: a path with no page behind it is a 404 a crawler
    // will index, and a page with no path is a page search never reaches.
    expect(await sitemapRoutes()).toEqual(PUBLIC_ROUTES);
  });
});

describe("the honesty gate covers the same set (AC-1, AC-8)", () => {
  it("fetches every public page the sitemap publishes", () => {
    expect(gateRoutes()).toEqual(PUBLIC_ROUTES);
  });
});

describe("every public page is built from the one helper (AC-7)", () => {
  it.each(PUBLIC_PAGE_FILES)("%s exports metadata", (file) => {
    expect(readSource(file)).toContain("export const metadata");
  });

  it.each(PUBLIC_PAGE_FILES)("%s takes its metadata from lib/seo", (file) => {
    const source = readSource(file);

    expect(source).toContain('from "@/lib/seo"');
    expect(source).toContain("publicPageMetadata(");
  });

  it.each(PUBLIC_PAGE_FILES)("%s writes no canonical by hand", (file) => {
    const source = readSource(file);

    expect(source).not.toContain("alternates:");
    expect(source).not.toContain("openGraph:");
    expect(source).not.toContain("SITE_URL");
  });
});
