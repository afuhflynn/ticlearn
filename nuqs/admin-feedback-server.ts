import { createSearchParamsCache } from "nuqs/server";
import { adminFeedbackViewParsers } from "./admin-feedback";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-feedback` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await adminFeedbackSearchParamsCache.parse(searchParams)`.
export const adminFeedbackSearchParamsCache = createSearchParamsCache(
  adminFeedbackViewParsers,
);
