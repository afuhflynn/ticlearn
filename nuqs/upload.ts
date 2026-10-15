import { parseAsString, parseAsStringLiteral } from "nuqs";

// Upload descriptor. The rename dialog is a view state modal
// (`modal=edit`) plus the note id in `selectedId`. The quiz setup
// dialog is a view state modal (`modal=quiz`); the quiz setup itself
// stays a local draft and never enters the URL, and neither do the
// picked file, the title draft, or the rename draft.
export const uploadViewParsers = {
  modal: parseAsStringLiteral(["edit", "quiz", ""]).withDefault(""),
  selectedId: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const uploadViewDefaults = {
  modal: "",
  selectedId: "",
};
