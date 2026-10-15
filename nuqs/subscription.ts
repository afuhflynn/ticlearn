import { parseAsStringLiteral } from "nuqs";

// Subscription descriptor. The payment method tabs are shareable view
// state defaulting to automatic payment. The upgrade dialog is a view
// state modal (`modal=upgrade`). Plan picks, payment drafts,
// transaction ids, and purchase setup stay local and never enter the
// URL, and neither do the payment recovery keys the page already reads.
export const subscriptionViewParsers = {
  tab: parseAsStringLiteral(["auto", "manual"]).withDefault("auto"),
  modal: parseAsStringLiteral(["upgrade", ""]).withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const subscriptionViewDefaults = {
  tab: "auto",
  modal: "",
};
