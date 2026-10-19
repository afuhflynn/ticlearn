/**
 * The one crawl rule for every signed in surface (spec 0012, AC-7).
 *
 * The rule lives in one helper so a route group opts in by spreading it and
 * cannot forget to, and so nobody writes the directive by hand.
 */
import { describe, expect, it } from "vitest";
import { noIndex } from "@/lib/metadata";

describe("the noindex helper (spec 0012 AC-7)", () => {
  it("tells a crawler to index the page nowhere and to follow no link out of it", () => {
    expect(noIndex.robots).toEqual({ index: false, follow: false });
  });

  it("carries the robots directive and nothing else, so a layout can spread it", () => {
    expect(Object.keys(noIndex)).toEqual(["robots"]);
  });
});
