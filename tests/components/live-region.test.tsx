import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Decorative, LiveRegion } from "@/components/ui/live-region";

describe("LiveRegion (covers: AC-18)", () => {
  it("announces its text politely and only when the text changes", () => {
    render(<LiveRegion>Searching the web</LiveRegion>);

    const region = screen.getByText("Searching the web");

    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("stays out of the visual page", () => {
    render(<LiveRegion>Reading your notes</LiveRegion>);

    expect(screen.getByText("Reading your notes")).toHaveClass("sr-only");
  });

  it("keeps an extra class beside the screen reader one", () => {
    render(<LiveRegion className="mt-1">Working</LiveRegion>);

    expect(screen.getByText("Working")).toHaveClass("sr-only", "mt-1");
  });
});

describe("Decorative (covers: AC-18)", () => {
  it("hides a ticking clock from assistive technology", () => {
    render(<Decorative>3s</Decorative>);

    expect(screen.getByText("3s")).toHaveAttribute("aria-hidden", "true");
  });
});
