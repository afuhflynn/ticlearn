/**
 * The fallback provider, from spec 0022.
 *
 * Called only when the primary provider hard failed or came back with nothing
 * readable. `basic` depth with chunks, not `advanced` with an answer: a
 * fallback needs to be fast and cheap, not clever. No country, because the
 * measured boost hurt relevance.
 */

import { fetchJson } from "./http";
import { normaliseResult } from "./normalize";
import type { NormalisedResult, SearchRecency } from "./types";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const BUDGET_MS = 5_000;

type TavilyResult = {
  url?: string;
  title?: string;
  content?: string;
  score?: number;
  published_date?: string | null;
  raw_content?: string | null;
};

type TavilyResponse = {
  results?: TavilyResult[];
  usage?: { credits?: number };
};

export function hasTavilyKey(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export type TavilySearchResult = {
  results: NormalisedResult[];
  credits: number;
};

export async function tavilySearch(input: {
  query: string;
  recency: SearchRecency;
}): Promise<TavilySearchResult> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("TAVILY_API_KEY is not set");
  }

  const body = {
    query: input.query,
    search_depth: "basic",
    max_results: 5,
    chunks_per_source: 2,
    include_answer: true,
    include_raw_content: false,
    include_usage: true,
    safe_search: true,
    ...(input.recency === "any" ? {} : { time_range: input.recency }),
  };

  const payload = (await fetchJson(
    TAVILY_SEARCH_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    BUDGET_MS,
  )) as TavilyResponse;

  const results: NormalisedResult[] = [];
  for (const item of payload?.results ?? []) {
    if (!item.url) continue;
    const result = normaliseResult({
      url: item.url,
      title: item.title ?? null,
      snippet: item.content ?? null,
      body: null,
      bodyExpected: false,
      score: typeof item.score === "number" ? item.score : undefined,
      publishedAt: item.published_date ?? null,
      language: null,
    });
    if (result) results.push(result);
  }

  return { results, credits: payload?.usage?.credits ?? 1 };
}
