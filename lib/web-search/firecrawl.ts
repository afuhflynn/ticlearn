/**
 * The primary provider, from spec 0022.
 *
 * Two calls: a cheap search that returns snippets only, and the same search
 * with page bodies fetched. `highlights` is set to `false` explicitly on every
 * call because its default is on, and the default returns whole pages instead
 * of snippets.
 */

import { fetchJson, ProviderRequestError } from "./http";
import { normaliseResult } from "./normalize";
import type { NormalisedResult, SearchDepth, SearchRecency } from "./types";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

const SEARCH_BUDGET_MS = 8_000;
const PAGES_BUDGET_MS = 12_000;
const READ_BUDGET_MS = 12_000;

const TBS_BY_RECENCY: Record<SearchRecency, string | undefined> = {
  any: undefined,
  day: "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
  year: "qdr:y",
};

let warnedMissingKey = false;

export function hasFirecrawlKey(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

/**
 * One warning per server process. A missing key is configuration, not traffic:
 * shouting on every search would bury the signal it is meant to be.
 */
export function warnMissingFirecrawlKeyOnce(): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.warn(
    "[web-search] FIRECRAWL_API_KEY is not set; every search starts at the fallback provider.",
  );
}

type FirecrawlSearchItem = {
  url?: string;
  title?: string;
  description?: string;
  snippet?: string;
  markdown?: string;
  position?: number;
  date?: string | null;
  metadata?: {
    title?: string;
    statusCode?: number;
    language?: string;
    publishedTime?: string;
    sourceURL?: string;
  };
};

type FirecrawlSearchResponse = {
  success?: boolean;
  creditsUsed?: number;
  data?: { web?: FirecrawlSearchItem[] } | FirecrawlSearchItem[];
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  creditsUsed?: number;
  data?: {
    markdown?: string;
    metadata?: FirecrawlSearchItem["metadata"] & { title?: string };
  };
};

function readItems(payload: FirecrawlSearchResponse): FirecrawlSearchItem[] {
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.web)) return data.web;
  return [];
}

function headers(): HeadersInit {
  const key = process.env.FIRECRAWL_API_KEY;
  return {
    Authorization: `Bearer ${key ?? ""}`,
    "Content-Type": "application/json",
  };
}

export function firecrawlToResults(
  items: FirecrawlSearchItem[],
  options: { bodyExpected: boolean },
): NormalisedResult[] {
  const results: NormalisedResult[] = [];

  for (const item of items) {
    if (!item.url) continue;
    const result = normaliseResult({
      url: item.url,
      title: item.title ?? item.metadata?.title ?? null,
      snippet: item.description ?? item.snippet ?? null,
      body: item.markdown ?? null,
      bodyExpected: options.bodyExpected,
      position: item.position ?? null,
      publishedAt: item.metadata?.publishedTime ?? item.date ?? null,
      language: item.metadata?.language ?? null,
      statusCode: item.metadata?.statusCode ?? null,
    });
    if (result) results.push(result);
  }

  return results;
}

export type FirecrawlSearchResult = {
  results: NormalisedResult[];
  credits: number;
};

/**
 * One Firecrawl search. `quick` asks for snippets only; `thorough` asks for the
 * page bodies too, which is also the retry mode after a useless quick answer.
 */
export async function firecrawlSearch(input: {
  query: string;
  depth: SearchDepth;
  recency: SearchRecency;
  country: string;
}): Promise<FirecrawlSearchResult> {
  const thorough = input.depth === "thorough";

  const body = {
    query: input.query,
    limit: thorough ? 3 : 6,
    sources: ["web"],
    domainTools: false,
    toolDetail: "compact",
    categories: [],
    tbs: TBS_BY_RECENCY[input.recency],
    country: input.country.toUpperCase(),
    safe: true,
    ignoreInvalidURLs: true,
    highlights: false,
    ...(thorough
      ? {
          scrapeOptions: {
            formats: ["markdown"],
            onlyMainContent: true,
            maxAge: 86_400_000,
            timeout: 12_000,
            parsers: ["pdf"],
          },
        }
      : {}),
  };

  const payload = (await fetchJson(
    `${FIRECRAWL_BASE}/search`,
    { method: "POST", headers: headers(), body: JSON.stringify(body) },
    thorough ? PAGES_BUDGET_MS : SEARCH_BUDGET_MS,
  )) as FirecrawlSearchResponse;

  if (payload?.success === false) {
    throw new ProviderRequestError("MALFORMED");
  }

  const results = firecrawlToResults(readItems(payload), {
    bodyExpected: thorough,
  });

  return {
    results,
    credits: payload?.creditsUsed ?? (thorough ? 5 : 2),
  };
}

export type FirecrawlReadResult = {
  result: NormalisedResult | null;
  credits: number;
};

/** One page, read through Firecrawl only. `readPage` never touches Tavily. */
export async function firecrawlReadPage(
  url: string,
): Promise<FirecrawlReadResult> {
  const payload = (await fetchJson(
    `${FIRECRAWL_BASE}/scrape`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        maxAge: 86_400_000,
        timeout: READ_BUDGET_MS,
        parsers: ["pdf"],
      }),
    },
    READ_BUDGET_MS + 3_000,
  )) as FirecrawlScrapeResponse;

  if (payload?.success === false || !payload?.data) {
    throw new ProviderRequestError("MALFORMED");
  }

  const metadata = payload.data.metadata;
  const result = normaliseResult({
    url: metadata?.sourceURL ?? url,
    title: metadata?.title ?? null,
    snippet: payload.data.markdown?.slice(0, 400) ?? null,
    body: payload.data.markdown ?? null,
    bodyExpected: true,
    publishedAt: metadata?.publishedTime ?? null,
    language: metadata?.language ?? null,
    statusCode: metadata?.statusCode ?? null,
  });

  return { result, credits: payload.creditsUsed ?? 1 };
}
