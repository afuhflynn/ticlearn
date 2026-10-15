import { parseAsString } from "nuqs";

// Dashboard quizzes descriptor. Search text uses `q` with an empty
// default. Filtering happens on the client over the loaded list, so
// the key is shareable view state even without server reads.
export const quizzesViewParsers = {
  q: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const quizzesViewDefaults = {
  q: "",
};
