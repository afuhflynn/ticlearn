import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

// Admin users descriptor. Search text uses `q` with an empty default.
// Role defaults to the area primary view (platform users). Unknown tab,
// filter, or modal values coerce to the declared default. The invite
// dialog is a view state modal (`modal=invite`); the invite email itself
// is a form draft and never enters the URL.
export const adminUsersViewParsers = {
  q: parseAsString.withDefault(""),
  role: parseAsStringLiteral(["USER", "ADMIN", "all"]).withDefault("USER"),
  onboarding: parseAsStringLiteral([
    "completed",
    "not_completed",
    "skipped",
    "all",
  ]).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  modal: parseAsStringLiteral(["invite", ""]).withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminUsersViewDefaults = {
  q: "",
  role: "USER",
  onboarding: "all",
  page: 1,
  limit: 20,
  modal: "",
  selectedId: "",
};
