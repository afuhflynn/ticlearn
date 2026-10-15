import { createSearchParamsCache } from "nuqs/server";
import { adminSubscriptionsViewParsers } from "./admin-subscriptions";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-subscriptions` instead, so server only imports stay out
// of client bundles. Server pages seed the cache with the page query
// prop: `await adminSubscriptionsSearchParamsCache.parse(searchParams)`.
export const adminSubscriptionsSearchParamsCache = createSearchParamsCache(
  adminSubscriptionsViewParsers,
);
