import type { Metadata } from "next";

/**
 * One crawl rule for every signed in surface, from spec 0012.
 *
 * A path prefix blocklist in `robots.txt` can only ever be wrong about routes
 * nobody has thought of yet, so the policy is driven by route group instead: a
 * route group opts in by spreading this, and cannot forget to.
 *
 * `follow` is false so a crawler cannot walk links out of a signed in page
 * into another private URL.
 */
export const noIndex: Pick<Metadata, "robots"> = {
  robots: {
    index: false,
    follow: false,
  },
};
