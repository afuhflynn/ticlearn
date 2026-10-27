import type { Metadata } from "next";

/**
 * The single source of truth for technical SEO values, from spec 0021 AC-7.
 * SITE_URL, AUTHED_PREFIXES, canonical and hreflang builders, OG defaults,
 * and structured data builders live here so public pages cannot drift.
 *
 * No database table, no migration, no new infrastructure. All metadata
 * strings stay in page files or in this file.
 */

export const SITE_URL = "https://ticlearn.ticsummit.org";

/**
 * Path prefixes for signed in surfaces. Shared by robots.ts, sitemap.ts and
 * the noIndex helper so the three can never disagree about what is authed.
 *
 * The entries carry no trailing slash, because the routes themselves do not:
 * the dashboard is `/dashboard`, not `/dashboard/`. A trailing slash matched
 * only the children, so `robots.txt` published `Disallow: /dashboard/` and
 * left `/dashboard` itself open, and this helper called `/dashboard` public.
 */
export const AUTHED_PREFIXES = [
  "/admin",
  "/api",
  "/dashboard",
  "/chat",
  "/settings",
  "/quizzes",
  "/notes",
  "/attempts",
  "/upload",
  "/subscription",
];

/**
 * Whether a path belongs to a signed in surface: the bare route and
 * everything under it, and nothing that merely starts with the same letters
 * (`/dashboardx` is not authed).
 */
export function isAuthedPath(path: string): boolean {
  const clean = path.replace(/\?.*$/, "");
  return AUTHED_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

/** Self referencing canonical URL for a path, query string stripped. */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path.replace(/\?.*$/, "")}`;
}

/** OG image defaults: 1200 by 630, default fallback image. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_DEFAULT_IMAGE = `${SITE_URL}/og/default.png`;

/**
 * Builds the full metadata object for a public page: title, description,
 * self referencing canonical, en-CM alternate, OG image, Twitter card and
 * indexable robots. Satisfies AC-1, AC-2, AC-3.
 */
export function publicPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}): Metadata {
  const canonical = canonicalUrl(opts.path);
  const imageUrl = opts.ogImage ?? OG_DEFAULT_IMAGE;
  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      // Absolute, built from SITE_URL, not a relative path for Next to resolve
      // against metadataBase. Two hosts for one truth meant changing SITE_URL
      // moved the sitemap and the OG image but left every canonical behind.
      canonical,
      languages: { "en-CM": canonical },
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: canonical,
      type: "website",
      locale: "en_CM",
      siteName: "TiCLearn",
      images: [
        { url: imageUrl, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [imageUrl],
    },
    robots: { index: true, follow: true },
  };
}

/** Organization structured data, rendered once per public page. */
export function organizationSchemaData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TiCLearn",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/android-chrome-512x512.png`,
    description:
      "Study platform for Cameroonian university students. Upload lecture notes, generate quizzes from them, and learn with Tip, the AI tutor.",
    sameAs: ["https://www.linkedin.com/company/tic-foundation"],
    parentOrganization: {
      "@type": "Organization",
      name: "Tic Foundation",
      url: "https://ticsummit.org",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "French"],
    },
    areaServed: {
      "@type": "Country",
      name: "Cameroon",
    },
    serviceType: ["Educational Software", "Online Learning Platform"],
    potentialAction: {
      "@type": "UseAction",
      target: `${SITE_URL}/sign-up`,
      name: "Sign Up",
    },
  };
}

/** WebSite structured data, home page only. */
export function websiteSchemaData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TiCLearn",
    url: SITE_URL,
  };
}

/** Course structured data for catalogue faculty pages. */
export function courseSchemaData(opts: {
  courseTitle: string;
  courseCode: string;
  providerName: string;
  providerUrl: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: opts.courseTitle,
    courseCode: opts.courseCode,
    provider: {
      "@type": "Organization",
      name: opts.providerName,
      url: opts.providerUrl,
    },
    ...(opts.description ? { description: opts.description } : {}),
    url: `${SITE_URL}/catalogue`,
  };
}
