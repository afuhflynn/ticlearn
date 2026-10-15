import { createSearchParamsCache } from "nuqs/server";
import { noteDetailViewParsers } from "./note-detail";

// Server only. Client components must import the parsers from
// `@/nuqs/note-detail` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await noteDetailSearchParamsCache.parse(searchParams)`.
export const noteDetailSearchParamsCache = createSearchParamsCache(
  noteDetailViewParsers,
);
