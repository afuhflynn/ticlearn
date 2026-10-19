// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The route table of spec 0012 against the build (spec 0012, AC-1).
 *
 * The spec names the check itself: the enumeration source is the build
 * manifest, because walking the `app/` tree cannot find the routes that are
 * not page files, such as `/favicon.ico` and `/_global-error`. The spec also
 * records how many page routes the build emits, so that a change in the
 * number is visible instead of silent.
 *
 * The test needs a build, so it stands down when there is no manifest.
 */
const root = process.cwd();
const manifestPath = join(root, ".next/app-path-routes-manifest.json");
const specPath = join(
  root,
  "docs/specs/0012-rendering-strategy-and-streaming-boundaries/index.md",
);

const hasBuild = existsSync(manifestPath);

function specText(): string {
  return readFileSync(specPath, "utf8");
}

function pageRoutes(): string[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    string
  >;

  return Object.keys(manifest)
    .filter((key) => !key.startsWith("/api/"))
    .map((key) =>
      key.replace(/\/\([^)]*\)/g, "").replace(/\/(page|route)$/, ""),
    )
    .sort();
}

/**
 * A route counts as written down when the spec names it, with or without a
 * leading slash, because the table lists the metadata routes without one. The
 * admin pages are the one group the table lists by name inside a bracket, so
 * only those may be matched on their last segment. Nothing else may, or a
 * common word would pass for a route.
 */
function isMentioned(route: string, spec: string): boolean {
  if (route === "/") {
    return spec.includes("`/`");
  }
  const withoutSlash = route.replace(/^\//, "");
  if (spec.includes(route) || spec.includes(withoutSlash)) {
    return true;
  }
  if (route.startsWith("/admin/")) {
    const lastSegment = withoutSlash.split("/").pop() ?? withoutSlash;
    return lastSegment.length > 0 && spec.includes(lastSegment);
  }
  return false;
}

describe.skipIf(!hasBuild)(
  "the route table against the build (spec 0012 AC-1)",
  () => {
    it("the build emits the number of page routes the spec records", () => {
      const spec = specText();
      const recorded = spec.match(/The count is (\d+) page routes/);

      expect(
        recorded,
        "the spec must record the number of page routes",
      ).not.toBeNull();
      expect(pageRoutes()).toHaveLength(Number(recorded?.[1]));
    });

    it("every page route the build emits is written down in the spec", () => {
      const spec = specText();
      const undocumented = pageRoutes().filter(
        (route) => !isMentioned(route, spec),
      );

      expect(undocumented).toEqual([]);
    });
  },
);
