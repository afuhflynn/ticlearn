// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/lib/seo";

/**
 * What each of the ten public pages publishes, from spec 0021 AC-1, AC-2 and
 * AC-3.
 *
 * The pages are imported, not read as text, so the assertion runs against the
 * metadata object Next renders into the served HTML. A page that loses its
 * canonical, its en-CM alternate or its own image fails here.
 *
 * The client bits the auth pages pull in are stubbed because this suite is
 * about the metadata, not the form.
 */
vi.mock("@/lib/auth-client", () => ({
  signIn: { social: vi.fn(), email: vi.fn() },
  signUp: { email: vi.fn() },
  useSession: () => ({ data: null, isPending: false }),
  sendVerificationOTP: vi.fn(),
  verifyEmailOTP: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("nuqs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("nuqs")>()),
  useQueryStates: () => [{} as Record<string, unknown>, vi.fn()],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    { get: () => vi.fn(({ children }) => children ?? null) },
  ),
}));

type PublicPage = {
  name: string;
  route: string;
  load: () => Promise<{ metadata: Metadata }>;
  ownImage?: string;
};

const PAGES: PublicPage[] = [
  {
    name: "home",
    route: "/",
    load: () => import("@/app/(marketing)/page"),
    ownImage: "/og/home.png",
  },
  {
    name: "about",
    route: "/about",
    load: () => import("@/app/(marketing)/about/page"),
    ownImage: "/og/about.png",
  },
  {
    name: "faq",
    route: "/faq",
    load: () => import("@/app/(marketing)/faq/page"),
    ownImage: "/og/faq.png",
  },
  {
    name: "contact",
    route: "/contact",
    load: () => import("@/app/(marketing)/contact/page"),
  },
  {
    name: "pricing",
    route: "/pricing",
    load: () => import("@/app/(marketing)/pricing/page"),
  },
  {
    name: "privacy",
    route: "/privacy",
    load: () => import("@/app/(marketing)/privacy/page"),
  },
  {
    name: "terms",
    route: "/terms",
    load: () => import("@/app/(marketing)/terms/page"),
  },
  {
    name: "sign in",
    route: "/sign-in",
    load: () => import("@/app/(auth)/sign-in/page"),
  },
  {
    name: "sign up",
    route: "/sign-up",
    load: () => import("@/app/(auth)/sign-up/page"),
  },
  {
    name: "verify email",
    route: "/verify-email",
    load: () => import("@/app/(auth)/verify-email/page"),
  },
];

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function openGraphOf(metadata: Metadata) {
  return metadata.openGraph as unknown as {
    url: string;
    title: string;
    description: string;
    images: { url: string; width: number; height: number }[];
  };
}

function alternatesOf(metadata: Metadata) {
  return metadata.alternates as unknown as {
    canonical: string;
    languages: Record<string, string>;
  };
}

describe.each(PAGES)("the $name page (AC-1, AC-2)", (page) => {
  it("publishes a title and a description of its own", async () => {
    const { metadata } = await page.load();
    const title = metadata.title as string;
    const description = metadata.description as string;

    expect(typeof title).toBe("string");
    expect(title.length).toBeGreaterThan(5);
    expect(typeof description).toBe("string");
    expect(description.length).toBeGreaterThan(20);
  });

  it("describes itself with a self referencing canonical", async () => {
    const { metadata } = await page.load();

    expect(alternatesOf(metadata).canonical).toBe(`${SITE_URL}${page.route}`);
  });

  it("publishes an en-CM self reference, and no French alternate yet", async () => {
    const { metadata } = await page.load();
    const { languages } = alternatesOf(metadata);

    expect(languages["en-CM"]).toBe(`${SITE_URL}${page.route}`);
    expect(languages["fr-CM"]).toBeUndefined();
  });

  it("says nothing about the school exam audience it no longer serves", async () => {
    const { metadata } = await page.load();
    const text = `${metadata.title} ${metadata.description}`.toLowerCase();

    for (const word of ["gce", "a level", "secondary school", "paper 3"]) {
      expect(text, `${page.name} metadata mentions ${word}`).not.toContain(
        word,
      );
    }
  });
});

describe.each(PAGES)("the $name page's share card (AC-3)", (page) => {
  it("points the open graph URL at the canonical", async () => {
    const { metadata } = await page.load();

    expect(openGraphOf(metadata).url).toBe(`${SITE_URL}${page.route}`);
  });

  it("declares an image at 1200 by 630", async () => {
    const { metadata } = await page.load();
    const [image] = openGraphOf(metadata).images;

    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(new URL(image.url, SITE_URL).origin).toBe(SITE_URL);
  });

  it("uses its own image where the spec names one, and the fallback elsewhere", async () => {
    const { metadata } = await page.load();
    const [image] = openGraphOf(metadata).images;

    // A relative image resolves against metadataBase, so compare the resolved
    // absolute URL rather than the raw string Next stores.
    expect(new URL(image.url, SITE_URL).href).toBe(
      page.ownImage
        ? `${SITE_URL}${page.ownImage}`
        : `${SITE_URL}/og/default.png`,
    );
  });

  it("asks for the large Twitter card with the same picture", async () => {
    const { metadata } = await page.load();
    const twitter = metadata.twitter as unknown as {
      card: string;
      images: string[];
    };

    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.images).toEqual([openGraphOf(metadata).images[0].url]);
  });
});

/**
 * AC-6 is a count as much as a presence: Organization once per public page,
 * WebSite on the home page only. A page that imports the schema itself would
 * double it against the layout, so only the layout may own it.
 */
describe("the structured data is rendered once (AC-6)", () => {
  it("the marketing layout owns the Organization block for every marketing page", () => {
    expect(readSource("app/(marketing)/layout.tsx")).toContain(
      "<OrganizationSchema />",
    );
  });

  it("the auth layout owns the Organization block for every auth page", () => {
    expect(readSource("app/(auth)/layout.tsx")).toContain(
      "<OrganizationSchema />",
    );
  });

  it("no public page renders the Organization block a second time", () => {
    const pages = [
      "app/(marketing)/page.tsx",
      "app/(marketing)/about/page.tsx",
      "app/(marketing)/faq/page.tsx",
      "app/(marketing)/contact/page.tsx",
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/privacy/page.tsx",
      "app/(marketing)/terms/page.tsx",
      "app/(auth)/sign-in/page.tsx",
      "app/(auth)/sign-up/page.tsx",
      "app/(auth)/verify-email/page.tsx",
    ];

    for (const file of pages) {
      expect(readSource(file), file).not.toContain("OrganizationSchema");
    }
  });

  it("only the home page renders the WebSite block", () => {
    expect(readSource("app/(marketing)/page.tsx")).toContain(
      "<WebSiteSchema />",
    );

    for (const file of [
      "app/(marketing)/about/page.tsx",
      "app/(marketing)/faq/page.tsx",
      "app/(marketing)/contact/page.tsx",
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/privacy/page.tsx",
      "app/(marketing)/terms/page.tsx",
    ]) {
      expect(readSource(file), file).not.toContain("WebSiteSchema");
    }
  });

  it("the root layout no longer renders the Organization block", () => {
    expect(readSource("app/layout.tsx")).not.toContain("OrganizationSchema");
  });
});

/**
 * AC-1 asks for a description written for this audience on every page, which
 * only holds while each page's copy is its own. Ten pages sharing one title is
 * the drift the shared helper cannot catch, because the helper is happy to
 * build the same object ten times.
 */
describe("the ten public pages say different things (AC-1)", () => {
  async function titles(): Promise<string[]> {
    return Promise.all(
      PAGES.map(async (page) => String((await page.load()).metadata.title)),
    );
  }

  async function descriptions(): Promise<string[]> {
    return Promise.all(
      PAGES.map(async (page) =>
        String((await page.load()).metadata.description),
      ),
    );
  }

  it("gives every page a title of its own", async () => {
    const values = await titles();

    expect(new Set(values).size).toBe(PAGES.length);
  });

  it("gives every page a description of its own", async () => {
    const values = await descriptions();

    expect(new Set(values).size).toBe(PAGES.length);
  });
});
