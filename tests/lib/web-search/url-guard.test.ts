import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { spendCredits } from "@/lib/credits";
import { getPlatformSettings } from "@/lib/platform-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings-direct";
import { prisma } from "@/lib/prisma";
import { checkReadableUrl, runReadPage } from "@/lib/web-search";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonArrayResponse(body: unknown, status = 200): Response {
  return jsonResponse(body, status);
}

function stubFetch(...responses: (() => Response)[]) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected provider call");
    return next();
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("the readPage URL guard (AC-10)", () => {
  it.each([
    ["http://127.0.0.1/x", "loopback"],
    ["http://localhost:3000/x", "localhost"],
    ["http://printer.local/x", "a .local host"],
    ["http://docs.internal/x", "a .internal host"],
    ["http://169.254.169.254/latest/meta-data", "link local"],
    ["http://10.0.0.5/x", "a private range"],
    ["http://192.168.1.4/x", "a home network"],
    ["http://[::1]/x", "IPv6 loopback"],
    ["file:///etc/passwd", "a file scheme"],
    ["ftp://example.com/x", "a non http scheme"],
  ])("refuses %s (%s) with a sentence, not a throw", (url) => {
    const check = checkReadableUrl(url);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.reason.length).toBeGreaterThan(10);
      expect(check.reason).not.toMatch(/firecrawl|tavily|undefined|Error/i);
    }
  });

  it("accepts an ordinary https page", () => {
    expect(checkReadableUrl("https://example.com/photosynthesis")).toEqual({
      ok: true,
      url: "https://example.com/photosynthesis",
    });
  });

  it("refuses a link over 2,048 characters", () => {
    const check = checkReadableUrl(`https://example.com/${"a".repeat(2_100)}`);
    expect(check.ok).toBe(false);
  });
});

describe("readPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FIRECRAWL_API_KEY = "fc-test";
    process.env.TAVILY_API_KEY = "tvly-test";
    vi.mocked(prisma.webSearchEvent.create).mockResolvedValue({
      id: "event-read",
    } as never);
    vi.mocked(prisma.webSearchEvent.update).mockResolvedValue({} as never);
    vi.mocked(getPlatformSettings).mockResolvedValue({
      ...DEFAULT_PLATFORM_SETTINGS,
      creditCostWebSearch: 1,
    });
    vi.mocked(spendCredits).mockResolvedValue({ balance: 10 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes no outbound request for a private address, and logs the refusal (AC-10, AC-11)", async () => {
    const fetchMock = stubFetch();

    const result = await runReadPage("http://127.0.0.1/admin", {
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    const [event] = vi
      .mocked(prisma.webSearchEvent.create)
      .mock.calls.map(([args]) => args.data as Record<string, unknown>);
    expect(event.tool).toBe("readPage");
    expect(event.degraded).toBe(true);
    expect(event.query).toBeNull();
  });

  it("reads one page through the primary provider and debits once (AC-10, AC-13)", async () => {
    const body = "Photosynthesis happens in the chloroplast. ".repeat(40);
    const fetchMock = stubFetch(() =>
      jsonArrayResponse({
        success: true,
        creditsUsed: 1,
        data: {
          markdown: body,
          metadata: {
            title: "Photosynthesis — Wikipedia",
            sourceURL: "https://en.wikipedia.org/wiki/Photosynthesis",
            language: "en",
            statusCode: 200,
          },
        },
      }),
    );

    const result = await runReadPage(
      "https://en.wikipedia.org/wiki/Photosynthesis",
      { userId: "user-1" },
    );

    expect(result.ok).toBe(true);
    expect(result.title).toBe("Photosynthesis — Wikipedia");
    expect(result.body).toContain("chloroplast");
    expect(result.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v2/scrape");

    expect(spendCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "WEB_SEARCH",
        amount: 1,
        referenceId: "event-read",
      }),
    );
  });

  it("caps a long page at 8,000 characters and marks the cut (AC-8)", async () => {
    const body = "Photosynthesis happens in the chloroplast. ".repeat(1_000);
    expect(body.length).toBeGreaterThan(8_000);

    stubFetch(() =>
      jsonArrayResponse({
        success: true,
        creditsUsed: 1,
        data: {
          markdown: body,
          metadata: {
            title: "Long page",
            sourceURL: "https://example.com/long",
            statusCode: 200,
          },
        },
      }),
    );

    const result = await runReadPage("https://example.com/long", {
      userId: "user-1",
    });

    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.body?.endsWith("… [truncated]")).toBe(true);
    expect(result.body?.length).toBeLessThanOrEqual(8_000);
    expect(result.warnings).toContain("TRUNCATED");
  });

  it("returns a readable sentence when the provider fails, and charges nothing (AC-10)", async () => {
    stubFetch(() => jsonResponse({ error: "nope" }, 500));

    const result = await runReadPage("https://example.com/x", {
      userId: "user-1",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(spendCredits).not.toHaveBeenCalled();
  });
});
