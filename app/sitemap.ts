import type { MetadataRoute } from "next";
import { isAuthedPath, SITE_URL } from "@/lib/seo";

/**
 * Every static public URL, and nothing authed, from spec 0021 AC-4. Dynamic
 * routes like /result/[shareId] are excluded from the static sitemap until a
 * later feature adds them. lastModified is the build time, so a deploy marks
 * every URL as touched.
 *
 * The entries are filtered through the shared authed path rule, so an authed
 * path added here by mistake is dropped rather than published. The comparison
 * is on the pathname, so a public URL that merely starts with the same letters
 * as an authed one (`/dashboardx`) is not dropped.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/sign-in`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/sign-up`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/verify-email`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return entries.filter((entry) => {
    const path = entry.url.startsWith(SITE_URL)
      ? entry.url.slice(SITE_URL.length) || "/"
      : entry.url;
    return !isAuthedPath(path);
  });
}
