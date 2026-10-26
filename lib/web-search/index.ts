/**
 * The search chain, from spec 0022.
 *
 * One module owns both providers, the fallback walk, the caps, the shared cache
 * and the bookkeeping. A caller gets a result a student can read and never
 * learns which company answered.
 *
 * Order: cache, Firecrawl search, Firecrawl pages, Tavily, an honest empty
 * answer. The event row is written before the cache and the cache is written
 * before the debit, so "no debit without a row" is mechanical rather than a
 * convention.
 */

import { getByKey, setByKey } from "@/lib/cache";
import { spendCredits } from "@/lib/credits";
import { getPlatformSettings } from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

import {
  firecrawlReadPage,
  firecrawlSearch,
  hasFirecrawlKey,
  warnMissingFirecrawlKeyOnce,
} from "./firecrawl";
import { errorCodeFrom } from "./http";
import {
  applyCaps,
  dedupeResults,
  evaluateResults,
  toToolResults,
  truncateAtBoundary,
} from "./normalize";
import {
  normaliseQuery,
  readPageKey,
  sha256,
  webSearchCacheKey,
} from "./query";
import { hasTavilyKey, tavilySearch } from "./tavily";
import {
  CAPS,
  type NormalisedResult,
  type ReadPageToolResult,
  type ResultWarning,
  SEARCH_DEPTHS,
  SEARCH_RECENCIES,
  type SearchAttempt,
  type SearchDepth,
  type SearchMode,
  type SearchProvider,
  type SearchRecency,
  WEB_SEARCH_CACHE_NAMESPACE,
  type WebSearchErrorCode,
  type WebSearchToolResult,
} from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** What a cache hit replays: the capped answer only, never the attempt trail. */
type CachedAnswer = {
  servedBy: SearchProvider;
  results: WebSearchToolResult["results"];
  contextChars: number;
  contextTruncated: boolean;
  providerCredits: number;
  resultCount: number;
};

type AttemptRun = {
  ok: boolean;
  results: NormalisedResult[];
  credits: number;
  errorCode: WebSearchErrorCode | null;
  durationMs: number;
};

export type WebSearchInput = {
  query: string;
  depth?: SearchDepth;
  recency?: SearchRecency;
  country?: string;
};

export type RunContext = { userId: string };

function cacheTtlMs(input: {
  depth: SearchDepth;
  recency: SearchRecency;
  servedBy: SearchProvider;
}): number {
  if (input.servedBy === "tavily") return HOUR;
  if (input.recency !== "any") return HOUR;
  return input.depth === "quick" ? 7 * DAY : 3 * DAY;
}

type EventInput = {
  userId: string | null;
  tool: "webSearch" | "readPage";
  query: string | null;
  url: string | null;
  queryHash: string;
  requestedDepth: string | null;
  requestedRecency: string | null;
  country: string;
  servedBy: string | null;
  fallbackUsed: boolean;
  degraded: boolean;
  resultCount: number;
  usableCount: number;
  contextChars: number;
  contextTruncated: boolean;
  providerCredits: number;
  durationMs: number;
  attempts: SearchAttempt[];
  errorCode: WebSearchErrorCode | null;
};

/**
 * One event row per call. A bookkeeping failure is logged with the event it
 * meant to write and never destroys the answer the student already has.
 */
async function recordEvent(input: EventInput): Promise<{ id: string } | null> {
  try {
    return await prisma.webSearchEvent.create({
      data: {
        ...input,
        attempts: input.attempts as never,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("[web-search] Could not write the event row:", error);
    return null;
  }
}

/**
 * Charge the configured cost, last in the call and referenced to the event
 * row. A failure is logged and the answer stands.
 */
async function debitFor(
  eventId: string | null,
  userId: string,
  description: string,
): Promise<number> {
  if (!eventId) return 0;
  try {
    const settings = await getPlatformSettings();
    const amount = settings.creditCostWebSearch;
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    await spendCredits({
      userId,
      amount,
      type: "WEB_SEARCH",
      description,
      referenceId: eventId,
    });

    await prisma.webSearchEvent.update({
      where: { id: eventId },
      data: { creditsCharged: amount },
    });

    return amount;
  } catch (error) {
    console.error(
      `[web-search] Credit debit failed for event ${eventId}:`,
      error,
    );
    return 0;
  }
}

function attemptRecord(
  provider: SearchProvider,
  mode: SearchMode,
  run: AttemptRun,
  usableCount: number,
): SearchAttempt {
  return {
    provider,
    mode,
    ok: run.ok,
    resultCount: run.results.length,
    usableCount,
    providerCredits: run.credits,
    durationMs: run.durationMs,
    errorCode: run.errorCode,
  };
}

async function runAttempt(
  work: () => Promise<{ results: NormalisedResult[]; credits: number }>,
): Promise<AttemptRun> {
  const startedAt = Date.now();
  try {
    const { results, credits } = await work();
    return {
      ok: true,
      results,
      credits,
      errorCode: null,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      results: [],
      credits: 0,
      errorCode: errorCodeFrom(error),
      durationMs: Date.now() - startedAt,
    };
  }
}

/**
 * Search the web. The caller gets `ok: false` with an empty list when nothing
 * usable came back, which is the sentence the student reads instead of an
 * invented citation.
 */
export async function runWebSearch(
  input: WebSearchInput,
  context: RunContext,
): Promise<WebSearchToolResult> {
  const startedAt = Date.now();
  const depth = SEARCH_DEPTHS.includes(input.depth as SearchDepth)
    ? (input.depth as SearchDepth)
    : "quick";
  const recency = SEARCH_RECENCIES.includes(input.recency as SearchRecency)
    ? (input.recency as SearchRecency)
    : "any";
  const country = (input.country ?? "CM").toUpperCase().slice(0, 2) || "CM";
  const query = input.query.trim();
  const queryHash = sha256(normaliseQuery(query));
  const cacheKey = webSearchCacheKey({ query, depth, recency, country });

  const cached = await getByKey<CachedAnswer>(
    WEB_SEARCH_CACHE_NAMESPACE,
    cacheKey,
  );
  if (cached) {
    await recordEvent({
      userId: context.userId,
      tool: "webSearch",
      query,
      url: null,
      queryHash,
      requestedDepth: depth,
      requestedRecency: recency,
      country,
      servedBy: "cache",
      fallbackUsed: false,
      degraded: false,
      resultCount: cached.resultCount,
      usableCount: cached.resultCount,
      contextChars: cached.contextChars,
      contextTruncated: cached.contextTruncated,
      providerCredits: 0,
      durationMs: Date.now() - startedAt,
      attempts: [],
      errorCode: null,
    });

    return { ok: true, degraded: false, results: cached.results };
  }

  const attempts: SearchAttempt[] = [];
  let trust: NormalisedResult[] = [];
  let servedBy: SearchProvider | null = null;
  let errorCode: WebSearchErrorCode | null = null;
  let providerCredits = 0;
  let fallbackUsed = false;

  const firecrawlReady = hasFirecrawlKey();
  if (!firecrawlReady) warnMissingFirecrawlKeyOnce();

  if (firecrawlReady) {
    const first = await runAttempt(() =>
      firecrawlSearch({ query, depth: "quick", recency, country }),
    );
    const firstEvaluation = evaluateResults(first.results, query);
    attempts.push(
      attemptRecord(
        "firecrawl",
        "search",
        first,
        firstEvaluation.usable.length,
      ),
    );
    providerCredits += first.credits;

    if (!first.ok) {
      // A hard failure skips the second pass entirely: calling a provider again
      // seconds after a 429 is a bug dressed as resilience.
      errorCode = first.errorCode;
    } else {
      let merged = first.results;
      let usable = firstEvaluation.usable;

      if (depth === "thorough" || firstEvaluation.worthRetrying) {
        const second = await runAttempt(() =>
          firecrawlSearch({ query, depth: "thorough", recency, country }),
        );
        const secondEvaluation = evaluateResults(second.results, query);
        attempts.push(
          attemptRecord(
            "firecrawl",
            "pages",
            second,
            secondEvaluation.usable.length,
          ),
        );
        providerCredits += second.credits;

        if (!second.ok) {
          errorCode = second.errorCode;
        } else {
          merged = dedupeResults([...merged, ...second.results]);
          usable = evaluateResults(merged, query).usable;
        }
      }

      if (usable.length > 0 && errorCode === null) {
        servedBy = "firecrawl";
        trust = usable;
      }
    }
  }

  if (!servedBy) {
    if (hasTavilyKey()) {
      fallbackUsed = true;
      const fallback = await runAttempt(() => tavilySearch({ query, recency }));
      const fallbackEvaluation = evaluateResults(fallback.results, query);
      attempts.push(
        attemptRecord(
          "tavily",
          "search",
          fallback,
          fallbackEvaluation.usable.length,
        ),
      );
      providerCredits += fallback.credits;

      if (fallback.ok && fallbackEvaluation.usable.length > 0) {
        servedBy = "tavily";
        errorCode = null;
        trust = fallbackEvaluation.usable;
      } else if (!fallback.ok) {
        errorCode = errorCode ?? fallback.errorCode;
      }
    } else if (!errorCode) {
      errorCode = "NO_KEY";
    }
  }

  const degraded = servedBy === null;
  const capped = applyCaps(trust, depth);
  const result: WebSearchToolResult = {
    ok: !degraded,
    degraded,
    results: toToolResults(capped.results),
  };

  const event = await recordEvent({
    userId: context.userId,
    tool: "webSearch",
    query,
    url: null,
    queryHash,
    requestedDepth: depth,
    requestedRecency: recency,
    country,
    servedBy,
    fallbackUsed,
    degraded,
    resultCount: trust.length,
    usableCount: trust.length,
    contextChars: capped.contextChars,
    contextTruncated: capped.truncated,
    providerCredits,
    durationMs: Date.now() - startedAt,
    attempts,
    errorCode,
  });

  if (!degraded && servedBy) {
    const answer: CachedAnswer = {
      servedBy,
      results: result.results,
      contextChars: capped.contextChars,
      contextTruncated: capped.truncated,
      providerCredits,
      resultCount: trust.length,
    };
    await setByKey(
      WEB_SEARCH_CACHE_NAMESPACE,
      cacheKey,
      answer,
      cacheTtlMs({ depth, recency, servedBy }),
    );
  }

  if (!degraded) {
    await debitFor(
      event?.id ?? null,
      context.userId,
      `Web search: ${query.slice(0, 80)}`,
    );
  }

  return result;
}

/** Refusals read as a sentence for the student, never as a thrown error. */
export type UrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost"];

/**
 * Anything that points back inside the network is refused before a request is
 * made. A refusal is a plain result, not a throw.
 */
export function checkReadableUrl(raw: string): UrlCheck {
  const url = raw.trim();
  if (url.length === 0) {
    return {
      ok: false,
      reason: "That link is empty, so there is nothing to open.",
    };
  }
  if (url.length > 2_048) {
    return {
      ok: false,
      reason: "That link is too long to open. Send a shorter one.",
    };
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, reason: "Only http and https links can be opened." };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "That link could not be opened." };
  }

  if (isPrivateHostname(parsed.hostname)) {
    return {
      ok: false,
      reason: "That link points to a private address, so it cannot be opened.",
    };
  }

  return { ok: true, url: parsed.toString() };
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)))
    return true;

  // IPv6 loopback, unique local and link local.
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const octets = v4.slice(1).map(Number);
    if (octets.some((octet) => octet > 255)) return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
  }

  return false;
}

/**
 * Read one page through Firecrawl only. Never cached: a page changes under us,
 * and a student pasting a link is asking about it now.
 */
export async function runReadPage(
  rawUrl: string,
  context: RunContext,
): Promise<ReadPageToolResult> {
  const startedAt = Date.now();
  const check = checkReadableUrl(rawUrl);
  const queryHash = readPageKey(check.ok ? check.url : rawUrl.trim());

  if (!check.ok) {
    await recordEvent({
      userId: context.userId,
      tool: "readPage",
      query: null,
      url: rawUrl.slice(0, 2_048),
      queryHash,
      requestedDepth: null,
      requestedRecency: null,
      country: "CM",
      servedBy: null,
      fallbackUsed: false,
      degraded: true,
      resultCount: 0,
      usableCount: 0,
      contextChars: 0,
      contextTruncated: false,
      providerCredits: 0,
      durationMs: Date.now() - startedAt,
      attempts: [],
      errorCode: null,
    });

    return {
      ok: false,
      title: null,
      body: null,
      truncated: false,
      warnings: [],
      reason: check.reason,
    };
  }

  const unavailable: ReadPageToolResult = {
    ok: false,
    title: null,
    body: null,
    truncated: false,
    warnings: [],
    reason: "That page could not be read right now.",
  };

  if (!hasFirecrawlKey()) {
    warnMissingFirecrawlKeyOnce();
    await recordEvent({
      userId: context.userId,
      tool: "readPage",
      query: null,
      url: check.url,
      queryHash,
      requestedDepth: null,
      requestedRecency: null,
      country: "CM",
      servedBy: null,
      fallbackUsed: false,
      degraded: true,
      resultCount: 0,
      usableCount: 0,
      contextChars: 0,
      contextTruncated: false,
      providerCredits: 0,
      durationMs: Date.now() - startedAt,
      attempts: [],
      errorCode: "NO_KEY",
    });
    return unavailable;
  }

  const readStartedAt = Date.now();
  let read: NormalisedResult | null = null;
  let readError: WebSearchErrorCode | null = null;
  let readCredits = 0;
  try {
    const scraped = await firecrawlReadPage(check.url);
    read = scraped.result;
    readCredits = scraped.credits;
  } catch (error) {
    readError = errorCodeFrom(error);
  }
  const run: AttemptRun = {
    ok: readError === null,
    results: read ? [read] : [],
    credits: readCredits,
    errorCode: readError,
    durationMs: Date.now() - readStartedAt,
  };

  if (!run.ok || !read) {
    await recordEvent({
      userId: context.userId,
      tool: "readPage",
      query: null,
      url: check.url,
      queryHash,
      requestedDepth: null,
      requestedRecency: null,
      country: "CM",
      servedBy: null,
      fallbackUsed: false,
      degraded: true,
      resultCount: 0,
      usableCount: 0,
      contextChars: 0,
      contextTruncated: false,
      providerCredits: run.credits,
      durationMs: Date.now() - startedAt,
      attempts: [attemptRecord("firecrawl", "read", run, 0)],
      errorCode: run.errorCode ?? "MALFORMED",
    });
    return unavailable;
  }

  const warnings: ResultWarning[] = [...read.warnings];
  const cut = truncateAtBoundary(read.body ?? "", CAPS.readPage.bodyChars);
  const body = cut.text.length > 0 ? cut.text : null;
  if (cut.truncated && !warnings.includes("TRUNCATED")) {
    warnings.push("TRUNCATED");
  }
  if (!body && !warnings.includes("NO_BODY")) warnings.push("NO_BODY");

  const usable = body !== null;
  const event = await recordEvent({
    userId: context.userId,
    tool: "readPage",
    query: null,
    url: check.url,
    queryHash,
    requestedDepth: null,
    requestedRecency: null,
    country: "CM",
    servedBy: "firecrawl",
    fallbackUsed: false,
    degraded: !usable,
    resultCount: 1,
    usableCount: usable ? 1 : 0,
    contextChars: body?.length ?? 0,
    contextTruncated: cut.truncated,
    providerCredits: run.credits,
    durationMs: Date.now() - startedAt,
    attempts: [attemptRecord("firecrawl", "read", run, usable ? 1 : 0)],
    errorCode: usable ? null : "MALFORMED",
  });

  if (usable) {
    await debitFor(
      event?.id ?? null,
      context.userId,
      `Page read: ${read.domain}`,
    );
  }

  return {
    ok: usable,
    title: read.title || null,
    body,
    truncated: cut.truncated,
    warnings,
    reason: usable ? null : "That page had no readable text.",
  };
}
