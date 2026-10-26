import type { Metadata } from "next";

/**
 * One crawl rule for every signed in surface, from spec 0012 and 0021 AC-5.
 *
 * A path prefix blocklist in `robots.txt` can only ever be wrong about routes
 * nobody has thought of yet, so the policy is driven by route group instead: a
 * route group opts in by spreading this, and cannot forget to.
 *
 * `follow` is false so a crawler cannot walk links out of a signed in page
 * into another private URL.
 *
 * The prefix list and the path matching live in `lib/seo.ts` and are shared
 * with robots.ts and sitemap.ts, so the three can never disagree about what is
 * authed.
 */
export const noIndex: Pick<Metadata, "robots"> = {
  robots: {
    index: false,
    follow: false,
  },
};

/** Whether a path belongs to a signed in surface. Defined in `lib/seo.ts`. */
export { isAuthedPath } from "@/lib/seo";
