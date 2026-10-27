import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  AUTHED_PREFIXES,
  canonicalUrl,
  isAuthedPath,
  OG_DEFAULT_IMAGE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  organizationSchemaData,
  publicPageMetadata,
  SITE_URL,
  websiteSchemaData,
} from "@/lib/seo";

/**
 * The shared SEO helpers, from spec 0021 AC-2, AC-5 and AC-7. These lock the
 * two defects the verify pass found: the authed prefixes carried trailing
 * slashes so the real routes (`/dashboard`, `/chat`, …) matched nothing, and
 * the Organization logo pointed at a file that does not exist.
 */

describe("the shared authed path rule (AC-5)", () => {
  it("treats the bare route and everything under it as authed", () => {
    expect(isAuthedPath("/dashboard")).toBe(true);
    expect(isAuthedPath("/dashboard/settings")).toBe(true);
    expect(isAuthedPath("/api/auth")).toBe(true);
    expect(isAuthedPath("/notes?page=2")).toBe(true);
  });

  it("matches every real route root, not just the children", () => {
    for (const prefix of AUTHED_PREFIXES) {
      expect(prefix.endsWith("/")).toBe(false);
      expect(isAuthedPath(prefix)).toBe(true);
      expect(isAuthedPath(`${prefix}/child`)).toBe(true);
    }
  });

  it("leaves public paths alone, including ones that share the letters", () => {
    expect(isAuthedPath("/")).toBe(false);
    expect(isAuthedPath("/pricing")).toBe(false);
    expect(isAuthedPath("/dashboardx")).toBe(false);
    expect(isAuthedPath("/notesmith")).toBe(false);
  });

  it("publishes a disallow rule for each authed route root", () => {
    const rules = robots().rules as { disallow: string[] };
    expect(rules.disallow).toEqual(AUTHED_PREFIXES);
    expect(rules.disallow).toContain("/dashboard");
  });

  it("lists only public URLs in the sitemap", async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const path = entry.url.slice(SITE_URL.length) || "/";
      expect(isAuthedPath(path)).toBe(false);
    }
  });
});

describe("canonical and alternates come from SITE_URL (AC-2, AC-7)", () => {
  it("builds an absolute canonical and strips the query string", () => {
    expect(canonicalUrl("/about")).toBe(`${SITE_URL}/about`);
    expect(canonicalUrl("/pricing?from=faq")).toBe(`${SITE_URL}/pricing`);
  });

  it("emits an absolute canonical and an en-CM self reference", () => {
    const metadata = publicPageMetadata({
      title: "About TiCLearn",
      description: "Who builds TiCLearn.",
      path: "/about",
    });
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/about`);
    expect(metadata.alternates?.languages).toEqual({
      "en-CM": `${SITE_URL}/about`,
    });
  });
});

describe("Organization structured data (AC-6)", () => {
  it("points its logo at a file that exists under public/", () => {
    const logo = organizationSchemaData().logo;
    expect(logo.startsWith(SITE_URL)).toBe(true);
    const file = path.join(
      process.cwd(),
      "public",
      logo.slice(SITE_URL.length),
    );
    expect(fs.existsSync(file)).toBe(true);
  });
});

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/verify-email",
];

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function filesUnder(relativeDir: string): string[] {
  const root = process.cwd();
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        found.push(full.slice(root.length + 1));
      }
    }
  };
  walk(path.join(root, relativeDir));
  return found;
}

describe("the social card a public page publishes (AC-3)", () => {
  it("asks the crawler to index and to follow", () => {
    const metadata = publicPageMetadata({
      title: "Pricing",
      description: "What TiCLearn costs.",
      path: "/pricing",
    });

    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("sends the default image when the page names none of its own", () => {
    const metadata = publicPageMetadata({
      title: "Contact TiCLearn",
      description: "Reach the team on WhatsApp.",
      path: "/contact",
    });
    const openGraph = metadata.openGraph as unknown as {
      images: { url: string; width: number; height: number }[];
    };

    expect(openGraph.images).toEqual([
      { url: OG_DEFAULT_IMAGE, width: 1200, height: 630 },
    ]);
  });

  it("carries the site name, the Cameroon locale and the page URL", () => {
    const metadata = publicPageMetadata({
      title: "FAQ",
      description: "Answers students ask.",
      path: "/faq",
      ogImage: "/og/faq.png",
    });
    const openGraph = metadata.openGraph as unknown as {
      url: string;
      siteName: string;
      locale: string;
      type: string;
    };

    expect(openGraph.url).toBe(`${SITE_URL}/faq`);
    expect(openGraph.siteName).toBe("TiCLearn");
    expect(openGraph.locale).toBe("en_CM");
    expect(openGraph.type).toBe("website");
  });

  it("carries the page's own title and description on the card", () => {
    const metadata = publicPageMetadata({
      title: "Contact TiCLearn",
      description: "Reach the team on WhatsApp.",
      path: "/contact",
    });
    const twitter = metadata.twitter as unknown as {
      title: string;
      description: string;
    };

    expect(twitter.title).toBe(metadata.title);
    expect(twitter.description).toBe(metadata.description);
  });

  it("reuses the one image for the Twitter card at large size", () => {
    const metadata = publicPageMetadata({
      title: "About TiCLearn",
      description: "Who builds TiCLearn.",
      path: "/about",
      ogImage: "/og/about.png",
    });
    const twitter = metadata.twitter as unknown as {
      card: string;
      images: string[];
    };

    expect(twitter.card).toBe("summary_large_image");
    // A relative image resolves against metadataBase, so compare the resolved
    // absolute URL rather than the raw string Next stores.
    expect(new URL(twitter.images[0], SITE_URL).href).toBe(
      `${SITE_URL}/og/about.png`,
    );
  });
});

/** Reads the width and height out of a PNG's IHDR chunk. */
function pngSize(relativePath: string): {
  signature: string;
  width: number;
  height: number;
} {
  const bytes = fs.readFileSync(
    path.join(process.cwd(), "public", relativePath),
  );

  // Bytes 1 to 4 are "PNG", then 8 bytes of IHDR, and the width and height
  // are big endian at offsets 16 and 20.
  return {
    signature: bytes.subarray(1, 4).toString("ascii"),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe("the social images are the size the metadata declares (AC-3)", () => {
  it.each(["home.png", "about.png", "faq.png", "default.png"])(
    "/og/%s is a real PNG at the declared size",
    (file) => {
      const size = pngSize(`og/${file}`);

      expect(size.signature).toBe("PNG");
      expect(size.width).toBe(OG_IMAGE_WIDTH);
      expect(size.height).toBe(OG_IMAGE_HEIGHT);
    },
  );

  it("gives the home, about and FAQ pages a picture of their own", () => {
    const bytesOf = (file: string) =>
      fs.readFileSync(path.join(process.cwd(), "public", "og", file));
    const fallback = bytesOf("default.png");

    for (const file of ["home.png", "about.png", "faq.png"]) {
      expect(
        bytesOf(file).equals(fallback),
        `${file} ships the same bytes as default.png, so the per page card is nominal`,
      ).toBe(false);
    }
  });
});

describe("the sitemap lists the public set and nothing else (AC-4)", () => {
  const pathOf = (entry: { url: string }) =>
    entry.url.startsWith(SITE_URL)
      ? entry.url.slice(SITE_URL.length) || "/"
      : entry.url;

  it.each(PUBLIC_PATHS)("lists %s", async (publicPath) => {
    const paths = (await sitemap()).map(pathOf);

    expect(paths).toContain(publicPath);
  });

  it("publishes absolute URLs under the one host", async () => {
    for (const entry of await sitemap()) {
      expect(entry.url.startsWith(SITE_URL), entry.url).toBe(true);
    }
  });

  it("leaves dynamic routes out until a later feature adds them", async () => {
    for (const entry of await sitemap()) {
      if (entry.url.includes("/catalogue/[university]/[faculty]")) {
        continue;
      }
      expect(entry.url).not.toContain("[");
    }
  });

  it("marks every entry with the build time", async () => {
    for (const entry of await sitemap()) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe("the robots file (AC-5)", () => {
  it("allows the public set and points at the sitemap", () => {
    const file = robots();
    const rules = file.rules as { userAgent: string; allow: string };

    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(file.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("disallows every authed route root without a trailing slash", () => {
    const rules = robots().rules as { disallow: string[] };

    expect(rules.disallow).toEqual(AUTHED_PREFIXES);
    for (const prefix of rules.disallow) {
      expect(prefix.endsWith("/"), `${prefix} ends with a slash`).toBe(false);
    }
  });
});

describe("the structured data (AC-6)", () => {
  it("describes the site once, under the one host", () => {
    const schema = websiteSchemaData();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.name).toBe("TiCLearn");
    expect(schema.url).toBe(SITE_URL);
  });

  it("describes the organization behind the site", () => {
    const schema = organizationSchemaData();

    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe("TiCLearn");
    expect(schema.url).toBe(SITE_URL);
    expect(schema.areaServed).toEqual({ "@type": "Country", name: "Cameroon" });
  });

  it("points its sign up action at the real sign up page", () => {
    expect(organizationSchemaData().potentialAction.target).toBe(
      `${SITE_URL}/sign-up`,
    );
  });
});

describe("one host for the whole public set (AC-7)", () => {
  it("builds the canonical from the exported host, with no double slash", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
    expect(canonicalUrl("/about")).not.toContain("//about");
  });

  it("hardcodes the host in no public page or layout", () => {
    const files = [
      ...filesUnder("app/(marketing)"),
      ...filesUnder("app/(auth)"),
      "app/layout.tsx",
      "app/robots.ts",
      "app/sitemap.ts",
    ];

    const offenders = files.filter((file) =>
      readSource(file).includes("ticlearn.ticsummit.org"),
    );

    expect(offenders).toEqual([]);
  });
});

describe("the sitemap stays valid XML a crawler will accept (AC-4)", () => {
  // The protocol defines one closed set of values. A typo in a page's
  // changeFrequency makes the entry invalid, which drops the whole URL.
  const CHANGE_FREQUENCIES = [
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never",
  ];

  it("lists each URL once", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps every priority between zero and one", async () => {
    for (const entry of await sitemap()) {
      const priority = entry.priority as number;

      expect(priority, entry.url).toBeGreaterThanOrEqual(0);
      expect(priority, entry.url).toBeLessThanOrEqual(1);
    }
  });

  it("uses only a change frequency the protocol defines", async () => {
    for (const entry of await sitemap()) {
      expect(CHANGE_FREQUENCIES, entry.url).toContain(entry.changeFrequency);
    }
  });

  it("marks every entry as touched at build time", async () => {
    const entries = await sitemap();
    const now = Date.now();

    for (const entry of entries) {
      const touched = (entry.lastModified as Date).getTime();

      expect(touched, entry.url).toBeLessThanOrEqual(now);
      expect(touched, entry.url).toBeGreaterThan(now - 60_000);
    }
  });
});

describe("the robots file keeps the public set crawlable (AC-5)", () => {
  const disallowed = () => (robots().rules as { disallow: string[] }).disallow;

  it("never closes the whole site", () => {
    // A bare "/" or "*" here would block every public page the sitemap
    // publishes, which is the opposite of the intent and silent at a glance.
    expect(disallowed()).not.toContain("/");
    expect(disallowed()).not.toContain("");
    expect(disallowed()).not.toContain("*");
  });

  it("names each authed root once", () => {
    const rules = disallowed();

    expect(new Set(rules).size).toBe(rules.length);
  });

  it("blocks no path the sitemap publishes", async () => {
    for (const entry of await sitemap()) {
      const path = entry.url.startsWith(SITE_URL)
        ? entry.url.slice(SITE_URL.length) || "/"
        : entry.url;

      for (const prefix of disallowed()) {
        expect(path === prefix || path.startsWith(`${prefix}/`), path).toBe(
          false,
        );
      }
    }
  });
});
