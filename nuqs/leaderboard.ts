import { parseAsInteger } from "nuqs";

// Dashboard leaderboard descriptor. Page floors at 1 (see clampPage in
// the shared module). Page size defaults to the area size of 20 and
// clamps from 1 to 100. An out of range page shows the empty result.
export const leaderboardViewParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const leaderboardViewDefaults = {
  page: 1,
  limit: 20,
};
