/**
 * One shape for every provider, from spec 0022.
 *
 * The model never learns which company answered a search: a provider name
 * stops at this module's edge. Everything a caller can read is normalised here,
 * and everything provider specific (attempt trail, credits, cache state) lands
 * in `WebSearchEvent` instead.
 */

/** The shared cache namespace the search chain reads and writes (spec 0010). */
export const WEB_SEARCH_CACHE_NAMESPACE = "web_search";

/** Bumping this invalidates every stored search answer at once. */
export const WEB_SEARCH_CACHE_VERSION = "ws:v1";

/** `quick` reads snippets only. `thorough` also fetches page bodies. */
export type SearchDepth = "quick" | "thorough";

/** How recent a result should be. `any` carries no time filter. */
export type SearchRecency = "any" | "day" | "week" | "month" | "year";

export const SEARCH_DEPTHS = ["quick", "thorough"] as const;
export const SEARCH_RECENCIES = [
  "any",
  "day",
  "week",
  "month",
  "year",
] as const;

/** A plain fact about a result the model may need to tell the student about. */
export type ResultWarning = "BLOCKED" | "PAYWALLED" | "NO_BODY" | "TRUNCATED";

/** Why a provider call failed. A code, never a provider message. */
export type WebSearchErrorCode =
  | "AUTH"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK"
  | "SERVER"
  | "MALFORMED"
  | "NO_KEY";

/** Which provider answered, and in which mode. Log only, never returned. */
export type SearchProvider = "firecrawl" | "tavily";

export type SearchMode = "search" | "pages" | "read";

export type NormalisedResult = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  body: string | null;
  bodyTruncated: boolean;
  score: number;
  publishedAt: string | null;
  language: string | null;
  warnings: ResultWarning[];
};

/** One provider call, kept for the event row. */
export type SearchAttempt = {
  provider: SearchProvider;
  mode: SearchMode;
  ok: boolean;
  resultCount: number;
  usableCount: number;
  providerCredits: number;
  durationMs: number;
  errorCode: WebSearchErrorCode | null;
};

/**
 * What the chain worked out. The tool layer turns this into a tool result, so
 * `servedBy` and the attempt trail never reach the model.
 */
export type SearchOutcome = {
  ok: boolean;
  degraded: boolean;
  servedBy: SearchProvider | "cache" | null;
  fallbackUsed: boolean;
  results: NormalisedResult[];
  attempts: SearchAttempt[];
  contextChars: number;
  contextTruncated: boolean;
  providerCredits: number;
  errorCode: WebSearchErrorCode | null;
};

/** Exactly what `webSearch` returns to the model. */
export type WebSearchToolResult = {
  ok: boolean;
  degraded: boolean;
  results: {
    url: string;
    title: string;
    snippet: string;
    body: string | null;
    publishedAt: string | null;
    warnings: ResultWarning[];
  }[];
};

/** Exactly what `readPage` returns to the model, refusal included. */
export type ReadPageToolResult = {
  ok: boolean;
  title: string | null;
  body: string | null;
  truncated: boolean;
  warnings: ResultWarning[];
  reason: string | null;
};

/**
 * The words that never count as a match on their own. Without this list "how"
 * would match every page and the usability gate would pass everything.
 */
export const QUERY_STOPWORDS: ReadonlySet<string> = new Set([
  "what",
  "how",
  "why",
  "when",
  "where",
  "which",
  "who",
  "explain",
  "compare",
  "find",
  "best",
  "does",
  "is",
  "are",
  "the",
  "a",
  "an",
  "of",
  "to",
  "for",
  "in",
  "on",
  "and",
  "or",
]);

/** Shorter words are ignored when matching a result against the query. */
export const SHARED_WORD_MIN_LENGTH = 3;

/** Cap per depth, from the spec's caps table. */
export const CAPS = {
  quick: {
    maxResults: 5,
    snippetChars: 1_200,
    bodyChars: 0,
    totalChars: 6_000,
  },
  thorough: {
    maxResults: 3,
    snippetChars: 2_000,
    bodyChars: 4_000,
    totalChars: 12_000,
  },
  readPage: {
    maxResults: 1,
    snippetChars: 0,
    bodyChars: 8_000,
    totalChars: 8_000,
  },
} as const;

/** `TRUNCATED` marks the tail the model cannot see. */
export const TRUNCATION_MARK = "… [truncated]";

/** A per request budget, so one chat turn cannot multiply the time budget. */
export const PER_REQUEST_CAPS = {
  webSearch: 2,
  readPage: 3,
} as const;
