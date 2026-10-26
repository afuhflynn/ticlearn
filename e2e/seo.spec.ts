import { expect, test } from "@playwright/test";
import { AUTHED_PREFIXES, SITE_URL } from "../lib/seo";

/**
 * The technical SEO foundation in a real browser, from spec 0021 AC-1 to AC-6.
 *
 * The unit suite asserts the metadata objects and the route functions. This
 * spec asserts what a crawler and a phone actually receive: the tags in the
 * served HTML, the robots file and the sitemap XML over HTTP. A page whose
 * metadata object is correct but whose wrapper drops it fails here, and so
 * does a robots file that disallows the wrong shape of path.
 */

const PAGES: { path: string; image: string }[] = [
  { path: "/", image: "/og/home.png" },
  { path: "/about", image: "/og/about.png" },
  { path: "/faq", image: "/og/faq.png" },
  { path: "/pricing", image: "/og/default.png" },
  { path: "/contact", image: "/og/default.png" },
  { path: "/privacy", image: "/og/default.png" },
  { path: "/terms", image: "/og/default.png" },
  { path: "/sign-in", image: "/og/default.png" },
  { path: "/sign-up", image: "/og/default.png" },
  { path: "/verify-email", image: "/og/default.png" },
];

/** The root layout's default title, which a page without metadata falls back to. */
const SHELL_TITLE = "TiCLearn - Study Your Lecture Notes with Tip";

for (const { path, image } of PAGES) {
  test(`${path} serves its own title, canonical and share card (AC-1 to AC-3)`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);

    // AC-1: a real title and description, not the shell the layout defaults to.
    await expect(page).not.toHaveTitle(SHELL_TITLE);
    expect((await page.title()).length).toBeGreaterThan(8);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length ?? 0).toBeGreaterThan(20);

    // AC-2: one self referencing canonical, plus the English Cameroon
    // alternate. No French alternate until French pages exist. Next serves
    // the root URL without a trailing slash, so the home page is the host on
    // its own.
    const canonical = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonical,
    );
    await expect(
      page.locator('link[rel="alternate"][hreflang="en-CM"]'),
    ).toHaveAttribute("href", canonical);
    await expect(
      page.locator('link[rel="alternate"][hreflang="fr-CM"]'),
    ).toHaveCount(0);

    // AC-3: the share card WhatsApp reads, at the size the metadata declares.
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${SITE_URL}${image}`,
    );
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      `${SITE_URL}${image}`,
    );

    // A public page is indexable, and its crawl rule comes from the helper.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow",
    );
  });

  test(`${path} carries one Organization block and WebSite only on home (AC-6)`, async ({
    page,
  }) => {
    await page.goto(path);
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const types = blocks.map(
      (block) => (JSON.parse(block) as { "@type": string })["@type"],
    );

    expect(types.filter((type) => type === "Organization")).toHaveLength(1);
    expect(types.filter((type) => type === "WebSite")).toHaveLength(
      path === "/" ? 1 : 0,
    );
  });
}

test("robots.txt keeps the signed in set out and points at the sitemap (AC-5)", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  const body = await response.text();
  const rules = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("disallow:"));

  // The defect this spec exists for: a trailing slash matched only the
  // children, so the bare route stayed crawlable.
  for (const prefix of AUTHED_PREFIXES) {
    expect(rules, `${prefix} is not disallowed`).toContain(
      `Disallow: ${prefix}`,
    );
    expect(rules).not.toContain(`Disallow: ${prefix}/`);
  }

  expect(rules).not.toContain("Disallow: /");
  expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("sitemap.xml lists the public set and nothing signed in (AC-4)", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);
  const xml = await response.text();
  const locs = Array.from(
    xml.matchAll(/<loc>(.*?)<\/loc>/g),
    (match) => match[1],
  );
  const bare = (url: string) => url.replace(/\/$/, "");

  expect(locs).toHaveLength(PAGES.length);

  for (const { path } of PAGES) {
    const expected = bare(`${SITE_URL}${path}`);

    expect(locs.map(bare), `${path} is missing`).toContain(expected);
  }

  for (const loc of locs) {
    expect(loc.startsWith(SITE_URL), `${loc} leaves the host`).toBe(true);

    for (const prefix of AUTHED_PREFIXES) {
      expect(loc, `${loc} is a signed in URL`).not.toMatch(
        new RegExp(`${prefix}(?:$|/)`),
      );
    }
  }
});
