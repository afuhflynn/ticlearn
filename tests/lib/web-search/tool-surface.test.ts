import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cache", () => ({
  getByKey: vi.fn(async () => null),
  setByKey: vi.fn(async () => undefined),
}));

import { createChatTools } from "@/lib/ai/tools";
import { getPlatformSettings } from "@/lib/platform-settings";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings-direct";
import { prisma } from "@/lib/prisma";
import { PER_REQUEST_CAPS } from "@/lib/web-search/types";

type FieldSchema = {
  safeParse: (value: unknown) => { success: boolean; data?: unknown };
};

type ObjectSchema = { shape: Record<string, FieldSchema> };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function firecrawlAnswer() {
  return jsonResponse({
    success: true,
    creditsUsed: 2,
    data: {
      web: [
        {
          url: "https://example.com/photosynthesis",
          title: "Photosynthesis",
          description:
            "Photosynthesis is how plants turn light into chemical energy. ".repeat(
              2,
            ),
          position: 1,
        },
      ],
    },
  });
}

function stubFetch(response: () => Response) {
  const mock = vi.fn(async () => response());
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("the tool surface the model sees (AC-1)", () => {
  const tools = createChatTools({ userId: "user-1" });

  it("declares webSearch with exactly four inputs, and no provider vocabulary", () => {
    const schema = tools.webSearch.inputSchema as unknown as ObjectSchema;
    expect(Object.keys(schema.shape).sort()).toEqual([
      "country",
      "depth",
      "query",
      "recency",
    ]);

    for (const banned of [
      "limit",
      "timeout",
      "provider",
      "language",
      "domains",
    ]) {
      expect(schema.shape).not.toHaveProperty(banned);
    }
  });

  it("defaults depth, recency and country, and refuses a query outside 3 to 500 characters", () => {
    const schema = tools.webSearch.inputSchema as unknown as ObjectSchema;

    expect(schema.shape.depth.safeParse(undefined)).toEqual({
      success: true,
      data: "quick",
    });
    expect(schema.shape.recency.safeParse(undefined)).toEqual({
      success: true,
      data: "any",
    });
    expect(schema.shape.country.safeParse(undefined)).toEqual({
      success: true,
      data: "CM",
    });

    expect(schema.shape.query.safeParse("ab").success).toBe(false);
    expect(schema.shape.query.safeParse("abc").success).toBe(true);
    expect(schema.shape.query.safeParse("a".repeat(501)).success).toBe(false);
    expect(schema.shape.depth.safeParse("deep").success).toBe(false);
    expect(schema.shape.country.safeParse("Cameroon").success).toBe(false);
  });

  it("caps a readPage link at 2,048 characters (AC-10)", () => {
    const schema = tools.readPage.inputSchema as unknown as ObjectSchema;
    expect(schema.shape.url.safeParse("a".repeat(2_048)).success).toBe(true);
    expect(schema.shape.url.safeParse("a".repeat(2_049)).success).toBe(false);
  });
});

describe("the per request cap (AC-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses a third search without reaching a provider", async () => {
    const fetchMock = stubFetch(firecrawlAnswer);
    const tools = createChatTools({ userId: "user-1" });
    const execute = tools.webSearch.execute as unknown as (
      input: unknown,
      options: unknown,
    ) => Promise<{ ok: boolean; degraded: boolean; results: unknown[] }>;

    const call = (query: string) =>
      execute(
        { query, depth: "quick", recency: "any", country: "CM" },
        { toolCallId: "call", messages: [] },
      );

    await call("photosynthesis light reaction");
    await call("chloroplast structure and function");

    const refused = await call("a third different query");

    expect(refused).toEqual({ ok: false, degraded: true, results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(PER_REQUEST_CAPS.webSearch);
  });

  it("refuses a fourth page read without reaching a provider", async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({
        success: true,
        creditsUsed: 1,
        data: {
          markdown: "Photosynthesis happens in the chloroplast. ".repeat(10),
          metadata: {
            title: "Page",
            sourceURL: "https://example.com/page",
            statusCode: 200,
          },
        },
      }),
    );
    const tools = createChatTools({ userId: "user-1" });
    const execute = tools.readPage.execute as unknown as (
      input: unknown,
      options: unknown,
    ) => Promise<{ ok: boolean; reason: string | null }>;

    for (let index = 0; index <= PER_REQUEST_CAPS.readPage; index += 1) {
      const result = await execute(
        { url: `https://example.com/page-${index}` },
        { toolCallId: "call", messages: [] },
      );
      if (index === PER_REQUEST_CAPS.readPage) {
        expect(result.ok).toBe(false);
        expect(result.reason).toBeTruthy();
      }
    }

    expect(fetchMock).toHaveBeenCalledTimes(PER_REQUEST_CAPS.readPage);
  });
});
