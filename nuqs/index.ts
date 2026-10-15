import {
  type inferParserType,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

// Shared cross cutting plumbing for view state in the URL. Page, page
// size, search text, and sort direction live here. Each screen area owns
// its tab set, sort columns, filters, and modal names in its own named
// descriptor under this folder. Auth return links, one time tokens,
// payment identifiers, and error codes stay in searchParamsSchema below
// and stay outside generic shareable view state.
export const sharedViewParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  q: parseAsString.withDefault(""),
  order: parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
};

export type SharedViewState = inferParserType<typeof sharedViewParsers>;

// A view value is always a string or an integer. Every managed key
// declares an explicit default, so canonical form is well defined.
export type ViewValue = string | number;

// Compares raw address keys against canonical values and returns the
// replace patch that makes the URL canonical. A key sitting on its
// default is dropped (clear on default). Any other key must read
// exactly as its canonical text. Returns an empty object when the URL
// is already canonical. This is the only place that reads the raw
// address, and only as a desync sensor: nuqs stays the home of state,
// and unknown keys are left alone for their own area to own. The patch
// keeps the input value types, so call sites assign without casts.
export function correctionsForKeys<T extends Record<string, ViewValue>>(
  raw: URLSearchParams,
  parsed: T,
  defaults: Record<string, ViewValue>,
): Partial<T> {
  const patch = {} as Partial<T>;
  for (const key of Object.keys(parsed)) {
    const value = parsed[key as keyof T];
    const fallback = defaults[key];
    if (value === undefined || fallback === undefined) continue;
    const rawValue = raw.get(key);
    if (value === fallback) {
      if (rawValue !== null) patch[key as keyof T] = value;
    } else if (rawValue !== String(value)) {
      patch[key as keyof T] = value;
    }
  }
  return patch;
}

// Page floors at 1. Anything else (including a non numeric value that
// slipped through) falls back to the first page.
export function clampPage(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

// Page size clamps from 1 to 100. Anything else falls back to 10.
export function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

// Auth pages (sign in, sign up, verify email) read these keys. Types are
// inferred from the parsers, so call sites use plain nullish coalescing
// and never cast a parser value.
export const searchParamsSchema = {
  callbackUrl: parseAsString,
  ref__: parseAsString,
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(10),
  archived: parseAsBoolean.withDefault(false),
  search: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  token: parseAsString,
  checkout_id: parseAsString,
  tab: parseAsString.withDefault("overview"),
  conversationId: parseAsString,
  email: parseAsString,
  error: parseAsString,
};

export type AuthParams = inferParserType<typeof searchParamsSchema>;
