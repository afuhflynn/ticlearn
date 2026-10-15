import { createSearchParamsCache } from "nuqs/server";
import { adminMetricsViewParsers } from "./admin-metrics";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-metrics` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await adminMetricsSearchParamsCache.parse(searchParams)`.
export const adminMetricsSearchParamsCache = createSearchParamsCache(
  adminMetricsViewParsers,
);
