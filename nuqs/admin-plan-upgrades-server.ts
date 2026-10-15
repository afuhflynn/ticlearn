import { createSearchParamsCache } from "nuqs/server";
import { adminPlanUpgradesViewParsers } from "./admin-plan-upgrades";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-plan-upgrades` instead, so server only imports stay out
// of client bundles. Server pages seed the cache with the page query
// prop: `await adminPlanUpgradesSearchParamsCache.parse(searchParams)`.
export const adminPlanUpgradesSearchParamsCache = createSearchParamsCache(
  adminPlanUpgradesViewParsers,
);
