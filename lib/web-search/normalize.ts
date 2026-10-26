/**
 * Normalisation, dedupe, the usability gate and the caps, from spec 0022.
 *
 * Both providers answer in their own shape. Everything the model can read is
 * produced here, and nothing else in the chain decides what is worth showing.
 */

import { detectLanguage, sharedWords, sharesWord } from "./query";
import {
  CAPS,
  type NormalisedResult,
  type ResultWarning,
  type SearchDepth,
  TRUNCATION_MARK,
  type WebSearchToolResult,
} from "./types";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "source",
]);

/** The URL two results have to agree on before they are treated as one. */
export function canonicalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.startsWith("utm_") || TRACKING_PARAMS.has(key)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.searchParams.sort();
  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString();
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * The shortest snippet worth handing the model, from the usability rule in
 * AC-4. A cut that leaves less than this is noise wearing a source's URL.
 */
export const MIN_READABLE_SNIPPET_CHARS = 100;

/**
 * Cut at the last sentence, heading or paragraph boundary inside the final 15
 * percent of the cap, and say so. A hard slice mid sentence is what makes a
 * fetched page read like garbage.
 *
 * The returned text never exceeds `cap`: the mark is counted in the budget, and
 * when the cap is too small to hold both, the mark is dropped rather than
 * allowed to overspend a total the caller promised the model.
 */
export function truncateAtBoundary(
  text: string,
  cap: number,
): { text: string; truncated: boolean } {
  if (cap <= 0) return { text: "", truncated: text.length > 0 };
  if (text.length <= cap) return { text, truncated: false };
  if (cap <= TRUNCATION_MARK.length + 1) {
    return { text: text.slice(0, cap).trimEnd(), truncated: true };
  }

  const room = Math.max(1, cap - TRUNCATION_MARK.length - 1);
  const head = text.slice(0, room);
  const windowStart = Math.floor(room * 0.85);

  let cut = -1;
  const boundary = /(?:\n#{1,6}\s|\n{2,}|[.!?](?=\s|$))/g;
  for (const match of head.matchAll(boundary)) {
    const end = (match.index ?? 0) + match[0].length;
    if ((match.index ?? 0) >= windowStart) cut = end;
  }
  if (cut < windowStart) {
    const space = head.lastIndexOf(" ");
    cut = space > 0 ? space : room;
  }

  const kept = head.slice(0, cut).trimEnd();
  return { text: `${kept} ${TRUNCATION_MARK}`, truncated: true };
}

function addWarning(warnings: ResultWarning[], warning: ResultWarning): void {
  if (!warnings.includes(warning)) warnings.push(warning);
}

/** A page that asks for money before it shows the text. */
function looksPaywalled(text: string): boolean {
  if (!text) return false;
  return /(subscribe|sign in|log in)[^.]{0,40}(to )?(continue|read)/i.test(
    text.slice(0, 600),
  );
}

export type RawResultInput = {
  url: string;
  title?: string | null;
  snippet?: string | null;
  body?: string | null;
  publishedAt?: string | null;
  language?: string | null;
  position?: number | null;
  score?: number | null;
  statusCode?: number | null;
  bodyExpected?: boolean;
};

/** Firecrawl has no score, so position, a body and a real snippet carry it. */
export function firecrawlScore(input: RawResultInput): number {
  const position = Math.max(1, input.position ?? 1);
  const bodyFactor = input.body ? 1.0 : 0.6;
  const snippetFactor = (input.snippet?.length ?? 0) >= 200 ? 1.0 : 0.7;
  return (1 / (1 + (position - 1) * 0.35)) * bodyFactor * snippetFactor;
}

export function normaliseResult(
  input: RawResultInput,
): NormalisedResult | null {
  const url = canonicalUrl(input.url);
  if (!url) return null;

  const snippet = (input.snippet ?? "").trim();
  const body = input.body?.trim() ? input.body.trim() : null;
  const warnings: ResultWarning[] = [];

  const status = input.statusCode ?? null;
  if (status === 401 || status === 403) addWarning(warnings, "BLOCKED");
  if (status === 402 || status === 407) addWarning(warnings, "PAYWALLED");
  if (input.bodyExpected && body === null) addWarning(warnings, "NO_BODY");
  if (!warnings.includes("PAYWALLED") && looksPaywalled(body ?? snippet)) {
    addWarning(warnings, "PAYWALLED");
  }

  return {
    url,
    domain: domainOf(url),
    title: (input.title ?? "").trim() || domainOf(url) || url,
    snippet,
    body,
    bodyTruncated: false,
    score: input.score ?? firecrawlScore({ ...input, body, snippet }),
    publishedAt: input.publishedAt ?? null,
    language: input.language ?? null,
    warnings,
  };
}

/**
 * One result per canonical URL. On a collision the survivor keeps the longer
 * snippet, the body that exists, both warnings, and the higher score.
 */
export function dedupeResults(results: NormalisedResult[]): NormalisedResult[] {
  const byUrl = new Map<string, NormalisedResult>();

  for (const result of results) {
    const key = canonicalUrl(result.url) || result.url;
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, { ...result, url: key, domain: domainOf(key) });
      continue;
    }

    const warnings = [...existing.warnings];
    for (const warning of result.warnings) addWarning(warnings, warning);

    const existingBody = existing.body ?? "";
    const incomingBody = result.body ?? "";
    const body =
      incomingBody.length > existingBody.length ? result.body : existing.body;

    byUrl.set(key, {
      ...existing,
      title:
        result.title.length > existing.title.length
          ? result.title
          : existing.title,
      snippet:
        result.snippet.length > existing.snippet.length
          ? result.snippet
          : existing.snippet,
      body,
      bodyTruncated: existing.bodyTruncated || result.bodyTruncated,
      score: Math.max(existing.score, result.score),
      publishedAt: existing.publishedAt ?? result.publishedAt,
      language: existing.language ?? result.language,
      warnings,
    });
  }

  return [...byUrl.values()];
}

export type UnusableReason =
  | "ZERO_RESULTS"
  | "NO_BODY"
  | "BLOCKED"
  | "PAYWALLED"
  | "NO_USABLE";

export type Evaluation = {
  usable: NormalisedResult[];
  reason: UnusableReason | null;
  /** True only when another pass in the other mode could plausibly help. */
  worthRetrying: boolean;
};

function readableText(result: NormalisedResult): string {
  return [result.title, result.snippet, result.body ?? ""].join("\n");
}

function hasReadableText(result: NormalisedResult): boolean {
  return (
    result.snippet.length >= MIN_READABLE_SNIPPET_CHARS ||
    (result.body?.length ?? 0) > 0
  );
}

function isRefused(result: NormalisedResult): boolean {
  return (
    result.warnings.includes("BLOCKED") || result.warnings.includes("PAYWALLED")
  );
}

/**
 * Which results a student could actually use, and why the rest were dropped.
 * A result needs a shared word with the query and real text, unless its
 * language differs from the query's or it is the last one standing: a French
 * page for an English question in Cameroon is still a real source.
 */
export function evaluateResults(
  results: NormalisedResult[],
  query: string,
): Evaluation {
  if (results.length === 0) {
    return { usable: [], reason: "ZERO_RESULTS", worthRetrying: true };
  }

  const words = sharedWords(query);
  const language = detectLanguage(query);
  const usable: NormalisedResult[] = [];

  results.forEach((result) => {
    if (isRefused(result)) return;
    if (!hasReadableText(result)) return;

    const speaksAnotherLanguage =
      result.language !== null &&
      result.language.slice(0, 2).toLowerCase() !== language;
    const lastStanding = results.length === 1;

    if (
      sharesWord(readableText(result), words) ||
      speaksAnotherLanguage ||
      lastStanding
    ) {
      usable.push(result);
    }
  });

  if (usable.length > 0) {
    return { usable, reason: null, worthRetrying: false };
  }

  const allBlocked = results.every((r) => r.warnings.includes("BLOCKED"));
  if (allBlocked) {
    return { usable: [], reason: "BLOCKED", worthRetrying: false };
  }

  const allPaywalled = results.every((r) => r.warnings.includes("PAYWALLED"));
  if (allPaywalled) {
    return { usable: [], reason: "PAYWALLED", worthRetrying: false };
  }

  const noReadableBody = results.every(
    (r) =>
      (r.body?.length ?? 0) === 0 &&
      r.snippet.length < MIN_READABLE_SNIPPET_CHARS,
  );
  if (noReadableBody) {
    return { usable: [], reason: "NO_BODY", worthRetrying: true };
  }

  return { usable: [], reason: "NO_USABLE", worthRetrying: false };
}

export type CappedResults = {
  results: NormalisedResult[];
  contextChars: number;
  truncated: boolean;
};

/**
 * Per result then total caps, in the order the model reads them. The last
 * result that would overflow is cut at a boundary and marked, and the ones
 * after it are dropped rather than half shown.
 */
export function applyCaps(
  results: NormalisedResult[],
  depth: SearchDepth,
): CappedResults {
  const cap = CAPS[depth];
  let total = 0;
  let truncated = false;
  const out: NormalisedResult[] = [];

  for (const result of results.slice(0, cap.maxResults)) {
    const warnings = [...result.warnings];

    let snippet = result.snippet;
    const snippetCut = truncateAtBoundary(snippet, cap.snippetChars);
    snippet = snippetCut.text;
    let body = result.body;
    if (body && cap.bodyChars > 0) {
      const bodyCut = truncateAtBoundary(body, cap.bodyChars);
      body = bodyCut.text;
    }
    // `quick` never carries a body: a bodyless entry and a thorough one are
    // stored under different keys, and this keeps the promise at the edge.
    if (cap.bodyChars === 0) body = null;

    const cost = snippet.length + (body?.length ?? 0);
    const room = cap.totalChars - total;

    if (cost > room) {
      truncated = true;
      addWarning(warnings, "TRUNCATED");

      const snippetRoom = Math.min(snippet.length, Math.max(0, room));
      snippet =
        snippetRoom > 0 ? truncateAtBoundary(snippet, snippetRoom).text : "";
      const bodyRoom = room - snippet.length;
      body =
        body && bodyRoom > TRUNCATION_MARK.length + 1
          ? truncateAtBoundary(body, bodyRoom).text
          : null;

      // A tail too short to read is not a source, so it is dropped rather than
      // shown as a fragment; the previous result already carries the mark.
      if (snippet.length < MIN_READABLE_SNIPPET_CHARS) break;

      total += snippet.length + (body?.length ?? 0);
      out.push({ ...result, snippet, body, warnings });
      break;
    }

    if (snippetCut.truncated || (result.body && body !== result.body)) {
      addWarning(warnings, "TRUNCATED");
    }

    total += cost;
    out.push({
      ...result,
      snippet,
      body,
      bodyTruncated: result.body !== null && body !== result.body,
      warnings,
    });
  }

  if (results.length > cap.maxResults) truncated = true;

  // Whatever was dropped, the model is reading an incomplete set, so the last
  // result carries the mark rather than the answer pretending to be whole.
  if (truncated) {
    const last = out.at(-1);
    if (last && !last.warnings.includes("TRUNCATED")) {
      addWarning(last.warnings, "TRUNCATED");
    }
  }

  return { results: out, contextChars: total, truncated };
}

/** Exactly what the model sees: no score, no domain, no provider. */
export function toToolResults(
  results: NormalisedResult[],
): WebSearchToolResult["results"] {
  return results.map((result) => ({
    url: result.url,
    title: result.title,
    snippet: result.snippet,
    body: result.body,
    publishedAt: result.publishedAt,
    warnings: result.warnings,
  }));
}
