import { createSearchParamsCache } from "nuqs/server";
import { describe, expect, it } from "vitest";
import {
  adminUsersViewDefaults,
  adminUsersViewParsers,
} from "@/nuqs/admin-users";

describe("admin users descriptor (spec 0007 thin thread)", () => {
  it("declares the area defaults beside the parsers", () => {
    expect(adminUsersViewDefaults).toEqual({
      q: "",
      role: "USER",
      onboarding: "all",
      page: 1,
      limit: 20,
      modal: "",
      selectedId: "",
    });
  });

  it("reads search text with an empty default", async () => {
    const cache = createSearchParamsCache(adminUsersViewParsers);
    expect((await cache.parse({})).q).toBe("");
    expect((await cache.parse({ q: "ada" })).q).toBe("ada");
  });

  it("defaults the role filter to the area primary view", async () => {
    const cache = createSearchParamsCache(adminUsersViewParsers);
    expect((await cache.parse({})).role).toBe("USER");
    expect((await cache.parse({ role: "ADMIN" })).role).toBe("ADMIN");
    expect((await cache.parse({ role: "bogus" })).role).toBe("USER");
  });

  it("coerces unknown onboarding and modal values to defaults", async () => {
    const cache = createSearchParamsCache(adminUsersViewParsers);
    const parsed = await cache.parse({
      onboarding: "bogus",
      modal: "bogus",
    });
    expect(parsed.onboarding).toBe("all");
    expect(parsed.modal).toBe("");
    expect((await cache.parse({ modal: "invite" })).modal).toBe("invite");
  });

  it("reads page and size as integers with area defaults", async () => {
    const cache = createSearchParamsCache(adminUsersViewParsers);
    const parsed = await cache.parse({ page: "abc", limit: "50" });
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(50);
  });
});
