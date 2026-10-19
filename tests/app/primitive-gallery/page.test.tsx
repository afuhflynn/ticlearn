// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrimitiveGalleryPage, { metadata } from "@/app/primitive-gallery/page";

/**
 * The primitive gallery page (spec 0012, AC-7).
 *
 * It is not in the navigation and not in the sitemap, so it takes the crawl
 * rule from the helper, and its body is a client island.
 */
const searchState = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchState.current,
}));

describe("the primitive gallery page (spec 0012 AC-7)", () => {
  it("takes its crawl rule from the helper", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("the primitive gallery page markup (spec 0012 AC-8)", () => {
  it("shows the gallery", () => {
    render(<PrimitiveGalleryPage />);

    expect(
      screen.getByRole("heading", { name: "Primitive gallery" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
  });
});
