import { createSearchParamsCache } from "nuqs/server";
import { quizzesViewParsers } from "./quizzes";

// Server only. Client components must import the parsers from
// `@/nuqs/quizzes` instead, so server only imports stay out of client
// bundles. Server pages seed the cache with the page query prop:
// `await quizzesSearchParamsCache.parse(searchParams)`.
export const quizzesSearchParamsCache =
  createSearchParamsCache(quizzesViewParsers);
