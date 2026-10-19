// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrimitiveGallery } from "@/components/primitive-gallery";

/**
 * The gallery body (spec 0012, AC-7 and AC-8).
 *
 * The page around it is a server component so it can declare its own robots
 * directive, and the body is a client island because it reads the theme query
 * and toggles the document class.
 */
const searchState = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchState.current,
}));

function renderWithTheme(theme: string | null) {
  searchState.current = new URLSearchParams(theme ? `theme=${theme}` : "");
  return render(<PrimitiveGallery />);
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("the primitive gallery (spec 0012 AC-8)", () => {
  it("shows the gallery and the button styles", () => {
    renderWithTheme(null);

    expect(
      screen.getByRole("heading", { name: "Primitive gallery" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ghost" })).toBeInTheDocument();
  });

  it("turns the dark theme on when the query asks for it", () => {
    renderWithTheme("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps the light theme for any other query", () => {
    renderWithTheme("light");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
