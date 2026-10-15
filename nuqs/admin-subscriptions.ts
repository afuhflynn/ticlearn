import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

// Admin subscriptions descriptor. Status defaults to the full list.
// The change plan dialog is a view state modal (`modal=change`) plus
// the subscription id in `selectedId`. The picked plan stays a local
// form draft inside the dialog and never enters the URL.
export const adminSubscriptionsViewParsers = {
  status: parseAsStringLiteral([
    "all",
    "PENDING",
    "ACTIVE",
    "FAILED",
  ]).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  modal: parseAsStringLiteral(["change", ""]).withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminSubscriptionsViewDefaults = {
  status: "all",
  page: 1,
  limit: 20,
  modal: "",
  selectedId: "",
};
