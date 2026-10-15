import { parseAsInteger, parseAsStringLiteral } from "nuqs";

// Admin feedback descriptor. Both filters use an explicit ALL literal
// instead of the old empty string, so unknown values coerce to a known
// default. This screen has no modal.
export const adminFeedbackViewParsers = {
  status: parseAsStringLiteral([
    "ALL",
    "OPEN",
    "IN_REVIEW",
    "RESOLVED",
  ]).withDefault("ALL"),
  type: parseAsStringLiteral([
    "ALL",
    "EXAM",
    "CHAT",
    "BUG",
    "FEATURE",
    "GENERAL",
  ]).withDefault("ALL"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminFeedbackViewDefaults = {
  status: "ALL",
  type: "ALL",
  page: 1,
  limit: 20,
};
