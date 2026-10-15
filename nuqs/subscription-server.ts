import { createSearchParamsCache } from "nuqs/server";
import { subscriptionViewParsers } from "./subscription";

// Server only. Client components must import the parsers from
// `@/nuqs/subscription` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await subscriptionSearchParamsCache.parse(searchParams)`.
export const subscriptionSearchParamsCache = createSearchParamsCache(
  subscriptionViewParsers,
);
