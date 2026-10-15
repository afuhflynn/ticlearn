import { createSearchParamsCache } from "nuqs/server";
import { leaderboardViewParsers } from "./leaderboard";

// Server only. Client components must import the parsers from
// `@/nuqs/leaderboard` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await leaderboardSearchParamsCache.parse(searchParams)`.
export const leaderboardSearchParamsCache = createSearchParamsCache(
  leaderboardViewParsers,
);
