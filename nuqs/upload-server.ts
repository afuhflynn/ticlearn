import { createSearchParamsCache } from "nuqs/server";
import { uploadViewParsers } from "./upload";

// Server only. Client components must import the parsers from
// `@/nuqs/upload` instead, so server only imports stay out of client
// bundles. Server pages seed the cache with the page query prop:
// `await uploadSearchParamsCache.parse(searchParams)`.
export const uploadSearchParamsCache =
  createSearchParamsCache(uploadViewParsers);
