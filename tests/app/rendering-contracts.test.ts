// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The rendering contracts of spec 0012 that are properties of the code rather
 * than of one component.
 *
 * Each check here is the runnable form of a command in the spec's verify.md.
 * They are the regression net for the change: a layout that grows a database
 * read again, a marketing page that becomes a client page again, or a page
 * that starts reading one student's data on the server again all fail here
 * rather than in production.
 */
const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function filesUnder(relativeDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        found.push(full.slice(root.length + 1));
      }
    }
  };
  walk(join(root, relativeDir));
  return found;
}

const LAYOUTS = [
  "app/(dashboard)/layout.tsx",
  "app/chat/layout.tsx",
  "app/(onboarding)/onboarding/layout.tsx",
  "app/(admin)/layout.tsx",
];

describe("the crawl rule (spec 0012 AC-7, narrowed by spec 0021 AC-5)", () => {
  it.each(LAYOUTS)("%s takes the directive from the helper", (layout) => {
    const source = read(layout);

    expect(source).toContain("noIndex");
  });

  it.each(LAYOUTS)("%s does not write the directive by hand", (layout) => {
    const source = read(layout);

    expect(source).not.toContain("robots:");
  });

  /**
   * Spec 0021 makes the three auth pages public: they are listed in the
   * sitemap and indexable, so their layout must not spread `noIndex`. The
   * signed in groups keep it.
   */
  it("the auth group stays public", () => {
    const source = read("app/(auth)/layout.tsx");

    expect(source).not.toContain("noIndex");
  });
});

describe("a layout is a shell (spec 0012 AC-2)", () => {
  it.each(LAYOUTS)("%s reads no session and no database", (layout) => {
    const source = read(layout);

    expect(source).not.toContain("getSession");
    expect(source).not.toContain("auth.api");
    expect(source).not.toContain("prisma");
  });

  it.each(LAYOUTS)("%s waits on no request scoped API", (layout) => {
    const source = read(layout);

    expect(source).not.toContain("headers(");
    expect(source).not.toContain("cookies(");
  });

  it.each(LAYOUTS)("%s holds no redirect", (layout) => {
    const source = read(layout);

    expect(source).not.toContain("redirect(");
  });
});

describe("the public pages stay server rendered (spec 0012 AC-10)", () => {
  it("no file under app/(marketing) is a client component", () => {
    const offenders = filesUnder("app/(marketing)").filter((file) =>
      read(file).includes('"use client"'),
    );

    expect(offenders).toEqual([]);
  });

  it("the three public pages own a metadata export", () => {
    for (const page of [
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/faq/page.tsx",
      "app/(marketing)/contact/page.tsx",
    ]) {
      expect(read(page), page).toContain("export const metadata");
    }
  });
});

describe("the redirect lives in the proxy only (spec 0012 AC-13)", () => {
  it("the dashboard page holds no redirect", () => {
    const source = read("app/(dashboard)/dashboard/page.tsx");

    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("next/navigation");
  });
});

describe("the authed pages read no per user data on the server (spec 0012 AC-14)", () => {
  it("no authed page reads the database", () => {
    const authedRoots = [
      "app/(dashboard)",
      "app/(admin)",
      "app/(auth)",
      "app/(onboarding)",
      "app/chat",
    ];
    // The dashboard page is the one exception the spec names, and it is safe
    // because the proxy gate keeps the route dynamic.
    const exception = "app/(dashboard)/dashboard/page.tsx";
    const offenders = authedRoots
      .flatMap((dir) => filesUnder(dir))
      .filter((file) => file.endsWith("page.tsx") && file !== exception)
      .filter((file) => {
        const source = read(file);
        return source.includes("@/lib/prisma") || source.includes("prisma.");
      });

    expect(offenders).toEqual([]);
  });
});

describe("one caching substrate (spec 0012 AC-12)", () => {
  it("the Next config does not turn on cacheComponents", () => {
    expect(read("next.config.ts")).not.toContain("cacheComponents");
  });
});
