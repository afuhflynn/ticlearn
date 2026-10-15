import { createSearchParamsCache } from "nuqs/server";
import { describe, expect, it } from "vitest";
import {
  leaderboardViewDefaults,
  leaderboardViewParsers,
} from "@/nuqs/leaderboard";

describe("leaderboard descriptor (spec 0007 thin thread)", () => {
  it("declares the area defaults beside the parsers", () => {
    expect(leaderboardViewDefaults).toEqual({ page: 1, limit: 20 });
    expect(Object.keys(leaderboardViewParsers).sort()).toEqual([
      "limit",
      "page",
    ]);
  });

  it("reads page and size as integers end to end", async () => {
    const cache = createSearchParamsCache(leaderboardViewParsers);
    const parsed = await cache.parse({ page: "2", limit: "20" });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
  });

  it("falls back to area defaults on missing keys", async () => {
    const cache = createSearchParamsCache(leaderboardViewParsers);
    expect(await cache.parse({})).toMatchObject({ page: 1, limit: 20 });
  });

  it("coerces an unparsable page to the default without throwing", async () => {
    const cache = createSearchParamsCache(leaderboardViewParsers);
    const parsed = await cache.parse({ page: "abc" });
    expect(parsed.page).toBe(1);
  });
});
