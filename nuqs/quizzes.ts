import { parseAsInteger, parseAsString } from "nuqs";

// Dashboard quizzes descriptor. Search text uses `q` with an empty
// default. Filtering happens on the client over the loaded list, so
// the key is shareable view state even without server reads. The chat
// failure card links here with the same canonical keys the generate
// routes echo: noteId plus topic plus count plus format plus level
// plus difficulty. The page opens the create entry prefilled and ready.
export const quizzesViewParsers = {
  q: parseAsString.withDefault(""),
  noteId: parseAsString.withDefault(""),
  topic: parseAsString.withDefault(""),
  count: parseAsInteger.withDefault(0),
  format: parseAsString.withDefault(""),
  level: parseAsString.withDefault(""),
  difficulty: parseAsString.withDefault(""),
};

// Canonical defaults for the correction pass. Kept beside the parsers
// so the two can never drift apart.
export const quizzesViewDefaults = {
  q: "",
  noteId: "",
  topic: "",
  count: 0,
  format: "",
  level: "",
  difficulty: "",
};
