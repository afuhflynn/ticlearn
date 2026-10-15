import { parseAsStringLiteral } from "nuqs";

// Note detail descriptor. The three content tabs are shareable view
// state defaulting to the overview.
export const noteDetailViewParsers = {
  tab: parseAsStringLiteral(["overview", "text", "topics"]).withDefault(
    "overview",
  ),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const noteDetailViewDefaults = {
  tab: "overview",
};
