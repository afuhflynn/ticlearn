// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(marketing)/page";

/**
 * The landing page (spec 0012, AC-10).
 *
 * The page is a server component. The hero stays a client island for now,
 * which the spec records as a follow up rather than a defect.
 */
vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("the landing page (spec 0012 AC-10)", () => {
  it("shows the headline in the first HTML", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Your lecture notes/ }),
    ).toBeInTheDocument();
  });

  it("names the universities the product is built for", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Buea and Bamenda universities" }),
    ).toBeInTheDocument();
  });

  it("shows the size of the community, the phone number and the data cost", () => {
    render(<HomePage />);

    expect(screen.getByText("2,500+ university students")).toBeInTheDocument();
    expect(screen.getByText("+237 222 12 34 56")).toBeInTheDocument();
    expect(screen.getByText("150 MB download · ~400 CFA")).toBeInTheDocument();
  });

  it("names the mobile money logos for a student who cannot see them", () => {
    render(<HomePage />);

    expect(screen.getByAltText("MTN Mobile Money")).toBeInTheDocument();
    expect(screen.getByAltText("Orange Money")).toBeInTheDocument();
  });
});
