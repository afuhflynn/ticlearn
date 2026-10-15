import { createSearchParamsCache } from "nuqs/server";
import { describe, expect, it } from "vitest";
import {
  clampLimit,
  clampPage,
  correctionsForKeys,
  searchParamsSchema,
  sharedViewParsers,
} from "@/nuqs";

describe("clampPage", () => {
  it("keeps a valid page as is", () => {
    expect(clampPage(1)).toBe(1);
    expect(clampPage(4)).toBe(4);
  });

  it("floors page numbers below 1 to the first page", () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-12)).toBe(1);
  });

  it("falls back to the first page for non numeric input", () => {
    expect(clampPage(Number.NaN)).toBe(1);
    expect(clampPage(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("drops fractions", () => {
    expect(clampPage(2.9)).toBe(2);
  });
});

describe("clampLimit", () => {
  it("keeps a size inside 1 to 100 as is", () => {
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(100)).toBe(100);
  });

  it("clamps a size outside 1 to 100", () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(101)).toBe(100);
    expect(clampLimit(5000)).toBe(100);
  });

  it("falls back to 10 for non numeric input", () => {
    expect(clampLimit(Number.NaN)).toBe(10);
  });
});

describe("correctionsForKeys (spec 0007 corrections)", () => {
  const defaults = { page: 1, limit: 20, q: "", role: "USER" };

  it("returns no patch when the URL is already canonical", () => {
    expect(
      correctionsForKeys(new URLSearchParams("page=2"), { page: 2 }, defaults),
    ).toEqual({});
    expect(
      correctionsForKeys(new URLSearchParams(""), { page: 1 }, defaults),
    ).toEqual({});
  });

  it("drops a defaulted key that is present raw (unparsable page input)", () => {
    expect(
      correctionsForKeys(
        new URLSearchParams("page=abc"),
        { page: 1 },
        defaults,
      ),
    ).toEqual({ page: 1 });
  });

  it("drops a defaulted literal that is present raw (unknown filter value)", () => {
    expect(
      correctionsForKeys(
        new URLSearchParams("role=bogus"),
        { role: "USER" },
        defaults,
      ),
    ).toEqual({ role: "USER" });
  });

  it("normalizes a valid but non canonical integer spelling", () => {
    expect(
      correctionsForKeys(new URLSearchParams("page=02"), { page: 2 }, defaults),
    ).toEqual({ page: 2 });
  });

  it("keeps a valid non default key untouched", () => {
    expect(
      correctionsForKeys(
        new URLSearchParams("role=ADMIN"),
        { role: "ADMIN" },
        defaults,
      ),
    ).toEqual({});
  });

  it("clears an empty raw search key back to its default", () => {
    expect(
      correctionsForKeys(new URLSearchParams("q="), { q: "" }, defaults),
    ).toEqual({ q: "" });
  });

  it("leaves keys outside the managed set alone", () => {
    expect(
      correctionsForKeys(
        new URLSearchParams("page=2&token=secret"),
        { page: 2 },
        defaults,
      ),
    ).toEqual({});
  });

  it("repairs several keys in one patch", () => {
    expect(
      correctionsForKeys(
        new URLSearchParams("page=abc&role=bogus"),
        { page: 1, role: "USER" },
        defaults,
      ),
    ).toEqual({ page: 1, role: "USER" });
  });
});

describe("shared parser typing (spec 0007 no casts)", () => {
  it("parses page and limit as integers, not text", async () => {
    const cache = createSearchParamsCache(sharedViewParsers);
    const parsed = await cache.parse({ page: "3", limit: "25" });
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
    expect(typeof parsed.page).toBe("number");
    expect(typeof parsed.limit).toBe("number");
  });

  it("coerces unparsable integers to their defaults", async () => {
    const cache = createSearchParamsCache(sharedViewParsers);
    const parsed = await cache.parse({ page: "abc", limit: "huge" });
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });

  it("parses the sort direction as a strict literal", async () => {
    const cache = createSearchParamsCache(sharedViewParsers);
    expect((await cache.parse({ order: "asc" })).order).toBe("asc");
    expect((await cache.parse({ order: "sideways" })).order).toBe("desc");
  });

  it("keeps auth keys nullable without casts", async () => {
    const cache = createSearchParamsCache(searchParamsSchema);
    const parsed = await cache.parse({});
    expect(parsed.callbackUrl).toBeNull();
    expect(parsed.token).toBeNull();
    expect(parsed.page).toBe(1);
    expect(typeof parsed.page).toBe("number");
  });
});
