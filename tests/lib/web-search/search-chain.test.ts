import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand in for the shared cache, so a hit is a hit and the TTL the
// chain asked for can be asserted rather than inferred.
vi.mock("@/lib/cache", () => {
  const store = new Map<string, unknown>();
  return {
    __store: store,
    getByKey: vi.fn(async (_namespace: string, key: string) => {
      return (store.get(key) as unknown) ?? null;
    }),
    setByKey: vi.fn(async (_namespace: string, key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
});

import * as cache from "@/lib/cache";
import { spendCredits } from "@/lib/credits";
import { getPlatformSettings } from "@/lib/platform-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings-direct";
import { prisma } from "@/lib/prisma";
import { runWebSearch } from "@/lib/web-search";

const store = (cache as unknown as { __store: Map<string, unknown> }).__store;

const QUERY = "photosynthesis light reaction";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function firecrawlPage(index: number, overrides: Record<string, unknown> = {}) {
  return {
    url: `https://example.com/photosynthesis-${index}`,
    title: `Photosynthesis, page ${index}`,
    description:
      "Photosynthesis is the process by which green plants turn light energy into chemical energy stored in glucose. ",
    position: index,
    ...overrides,
  };
}

function firecrawlBody(items: unknown[], creditsUsed = 2) {
  return { success: true, creditsUsed, data: { web: items } };
}

function tavilyBody(items: { url: string; title: string; content: string }[]) {
  return {
    results: items.map((item, index) => ({
      ...item,
      score: 0.9 - index * 0.05,
    })),
    usage: { credits: 1 },
  };
}

/** A queue of provider answers, in call order. */
function stubFetch(...responses: (() => Response)[]) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected provider call");
    return next();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function createdEvents() {
  return vi
    .mocked(prisma.webSearchEvent.create)
    .mock.calls.map(([args]) => args.data as Record<string, unknown>);
}

describe("web search chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    process.env.FIRECRAWL_API_KEY = "fc-test";
    process.env.TAVILY_API_KEY = "tvly-test";

    vi.mocked(prisma.webSearchEvent.create).mockResolvedValue({
      id: "event-1",
    } as never);
    vi.mocked(prisma.webSearchEvent.update).mockResolvedValue({} as never);
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...DEFAULT_PLATFORM_SETTINGS,
      creditCostWebSearch: 1,
    });
    vi.mocked(spendCredits).mockResolvedValue({ balance: 99 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves a useful quick answer from the primary provider, writes one event and debits once (AC-2, AC-8, AC-11, AC-13)", async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse(firecrawlBody([firecrawlPage(1), firecrawlPage(2)])),
    );

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(result.degraded).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [event] = createdEvents();
    expect(event.servedBy).toBe("firecrawl");
    expect(event.fallbackUsed).toBe(false);
    expect(event.degraded).toBe(false);
    expect(event.queryHash).toEqual(expect.any(String));

    expect(spendCredits).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        amount: 1,
        type: "WEB_SEARCH",
        referenceId: "event-1",
      }),
    );
    expect(prisma.webSearchEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { creditsCharged: 1 },
    });

    // A quick, undated answer is worth a week.
    expect(cache.setByKey).toHaveBeenCalledWith(
      "web_search",
      expect.any(String),
      expect.any(Object),
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it("treats a 105 character snippet as useful and does not spend a second pass (AC-4)", async () => {
    const shortSnippet =
      "Photosynthesis converts light energy into chemical energy inside the chloroplast of a plant cell today.";
    expect(shortSnippet.length).toBeGreaterThan(100);
    expect(shortSnippet.length).toBeLessThan(160);

    const fetchMock = stubFetch(() =>
      jsonResponse(
        firecrawlBody([firecrawlPage(1, { description: shortSnippet })]),
      ),
    );

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(result.results[0].snippet).toBe(shortSnippet);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once in page reading mode after an empty answer, and never calls the fallback (AC-4)", async () => {
    const fetchMock = stubFetch(
      () => jsonResponse(firecrawlBody([])),
      () =>
        jsonResponse({
          success: true,
          creditsUsed: 4,
          data: {
            web: [
              firecrawlPage(1, {
                markdown: "Photosynthesis detail. ".repeat(40),
              }),
            ],
          },
        }),
    );

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondBody = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(secondBody.limit).toBe(3);
    expect(secondBody.scrapeOptions).toBeDefined();

    const [event] = createdEvents();
    expect(event.servedBy).toBe("firecrawl");
    expect(event.fallbackUsed).toBe(false);
  });

  it("goes straight to the fallback on a hard failure, with no second primary pass (AC-3, AC-5, AC-15)", async () => {
    const fetchMock = stubFetch(
      () => jsonResponse({ error: "rate limited" }, 429),
      () =>
        jsonResponse(
          tavilyBody([
            {
              url: "https://example.org/photosynthesis",
              title: "Photosynthesis explained",
              content: "Photosynthesis in detail. ".repeat(10),
            },
          ]),
        ),
    );

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("api.tavily.com");

    const [event] = createdEvents();
    expect(event.servedBy).toBe("tavily");
    expect(event.fallbackUsed).toBe(true);

    // A fallback answer is cached for an hour only.
    expect(cache.setByKey).toHaveBeenCalledWith(
      "web_search",
      expect.any(String),
      expect.any(Object),
      60 * 60 * 1000,
    );
  });

  it("answers honestly when nothing usable comes back, charging and caching nothing (AC-9, AC-13)", async () => {
    stubFetch(
      () => jsonResponse(firecrawlBody([])),
      () => jsonResponse(firecrawlBody([])),
      () => jsonResponse(tavilyBody([])),
    );

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result).toEqual({ ok: false, degraded: true, results: [] });
    expect(spendCredits).not.toHaveBeenCalled();
    expect(cache.setByKey).not.toHaveBeenCalled();

    const [event] = createdEvents();
    expect(event.degraded).toBe(true);
    expect(event.servedBy).toBeNull();
  });

  it("serves a repeated question from the cache at no cost (AC-14)", async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse(firecrawlBody([firecrawlPage(1)])),
    );

    await runWebSearch({ query: QUERY }, { userId: "user-1" });
    const second = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(second.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spendCredits).toHaveBeenCalledTimes(1);

    const events = createdEvents();
    expect(events).toHaveLength(2);
    expect(events[1].servedBy).toBe("cache");
    expect(events[1].fallbackUsed).toBe(false);
  });

  it("keeps the answer when the debit fails and records nothing charged (AC-13)", async () => {
    const error = new Error("InsufficientCredits");
    error.name = "InsufficientCreditsError";
    vi.mocked(spendCredits).mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    stubFetch(() => jsonResponse(firecrawlBody([firecrawlPage(1)])));

    const result = await runWebSearch({ query: QUERY }, { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(consoleError).toHaveBeenCalled();
    expect(prisma.webSearchEvent.update).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("warns once when the primary key is missing, and never calls it (AC-17)", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const fetchMock = stubFetch(() =>
      jsonResponse(
        tavilyBody([
          {
            url: "https://example.org/photosynthesis",
            title: "Photosynthesis",
            content: "Photosynthesis in detail. ".repeat(10),
          },
        ]),
      ),
    );

    await runWebSearch({ query: QUERY }, { userId: "user-1" });
    await runWebSearch(
      { query: "another query altogether" },
      { userId: "user-1" },
    );

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.every((url) => url.includes("api.tavily.com"))).toBe(true);
    expect(consoleWarn).toHaveBeenCalledTimes(1);

    consoleWarn.mockRestore();
  });
});
