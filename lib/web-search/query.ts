import { createHash } from "node:crypto";

import {
  QUERY_STOPWORDS,
  type SearchDepth,
  type SearchRecency,
  SHARED_WORD_MIN_LENGTH,
  WEB_SEARCH_CACHE_VERSION,
} from "./types";

const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

/**
 * Lowercase words of at least three characters, stopwords removed. The same
 * tokeniser serves the cache key and the shared word gate, so a page that
 * matches on "how" can never slip through.
 */
export function contentWords(text: string): string[] {
  const matches = text.toLowerCase().match(WORD_PATTERN) ?? [];
  return matches.filter(
    (word) =>
      word.length >= SHARED_WORD_MIN_LENGTH && !QUERY_STOPWORDS.has(word),
  );
}

/** The words a result has to share with the query to be worth showing. */
export function sharedWords(query: string): Set<string> {
  return new Set(contentWords(query));
}

/** True when the text contains at least one of the query's content words. */
export function sharesWord(text: string, words: Set<string>): boolean {
  if (words.size === 0) return false;
  for (const word of contentWords(text)) {
    if (words.has(word)) return true;
  }
  return false;
}

/**
 * The query as it is hashed and cached: lowercased, whitespace collapsed, and
 * stopwords removed so two near identical questions share one answer. A query
 * made only of stopwords keeps its collapsed form rather than becoming empty.
 */
export function normaliseQuery(query: string): string {
  const collapsed = query.toLowerCase().replace(/\s+/g, " ").trim();
  const meaningful = contentWords(collapsed).join(" ");
  return meaningful.length > 0 ? meaningful : collapsed;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type WebSearchKeyInput = {
  query: string;
  depth: SearchDepth;
  recency: SearchRecency;
  country: string;
};

/**
 * The cache key for one search. Depth is in the key on purpose: a stored
 * `quick` entry carries no body, and a `thorough` caller must never receive a
 * bodyless one.
 */
export function webSearchCacheKey(input: WebSearchKeyInput): string {
  const normalised = normaliseQuery(input.query);
  return sha256(
    [
      WEB_SEARCH_CACHE_VERSION,
      normalised,
      input.depth,
      input.recency,
      input.country.toUpperCase(),
    ].join("|"),
  );
}

/** `readPage` has no cache, but its event row still carries a stable hash. */
export function readPageKey(url: string): string {
  return sha256(`${WEB_SEARCH_CACHE_VERSION}|read|${url}`);
}

const FRENCH_MARKERS = new Set([
  "est",
  "les",
  "des",
  "pour",
  "avec",
  "dans",
  "quelle",
  "quels",
  "quelles",
  "comment",
  "pourquoi",
  "explique",
]);

/**
 * The language a query is written in, coarsely. It exists so a French page
 * returned for an English query in Cameroon is kept rather than dropped as
 * "no shared word": the gate must never empty the answer on language grounds.
 */
export function detectLanguage(query: string): string {
  const words = query.toLowerCase().match(WORD_PATTERN) ?? [];
  for (const word of words) {
    if (FRENCH_MARKERS.has(word)) return "fr";
  }
  return "en";
}
