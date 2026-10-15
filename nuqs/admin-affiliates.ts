import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

// Admin affiliates descriptor. Search text uses `q` with an empty
// default. The four dialogs share one modal name plus the row id in
// `selectedId`: create carries no id, details and pay and suspend carry
// the affiliate id. Opening uses the existing detail fetch; an invalid
// or missing id closes the modal and corrects the URL with replace.
// Create form drafts never enter the URL.
export const adminAffiliatesViewParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  modal: parseAsStringLiteral([
    "create",
    "details",
    "pay",
    "suspend",
    "",
  ]).withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const adminAffiliatesViewDefaults = {
  q: "",
  page: 1,
  limit: 20,
  modal: "",
  selectedId: "",
};
