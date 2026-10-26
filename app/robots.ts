import type { MetadataRoute } from "next";
import { AUTHED_PREFIXES, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: AUTHED_PREFIXES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
