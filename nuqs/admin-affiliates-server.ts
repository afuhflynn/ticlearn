import { createSearchParamsCache } from "nuqs/server";
import { adminAffiliatesViewParsers } from "./admin-affiliates";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-affiliates` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await adminAffiliatesSearchParamsCache.parse(searchParams)`.
export const adminAffiliatesSearchParamsCache = createSearchParamsCache(
  adminAffiliatesViewParsers,
);
