import { createSearchParamsCache } from "nuqs/server";
import { adminUsersViewParsers } from "./admin-users";

// Server only. Client components must import the parsers from
// `@/nuqs/admin-users` instead, so server only imports stay out of
// client bundles. Server pages seed the cache with the page query prop:
// `await adminUsersSearchParamsCache.parse(searchParams)`.
export const adminUsersSearchParamsCache = createSearchParamsCache(
  adminUsersViewParsers,
);
