import { parseAsStringLiteral } from "nuqs";

// Subscription descriptor. The upgrade dialog is a view state modal
// (`modal=upgrade`). Plan picks, payment drafts, transaction ids, and
// purchase setup stay local and never enter the URL.
export const subscriptionViewParsers = {
  modal: parseAsStringLiteral(["upgrade", ""]).withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const subscriptionViewDefaults = {
  modal: "",
};
