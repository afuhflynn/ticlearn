import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingNav } from "@/components/layout/MarketingNav";

/**
 * The marketing navigation (spec 0014, AC-1; spec 0015, sections and AC-5).
 *
 * The nav carries the mockup's four anchors, a landing only announcement
 * strip, and the signed in vs signed out actions. It must never link a
 * surface the rebuild cut.
 */

const usePathnameMock = vi.hoisted(() => vi.fn());
const useSessionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: useSessionMock,
}));

vi.mock("@/components/user/user-button", () => ({
  UserButton: ({ user }: { user: { name?: string | null } }) => (
    <div>account for {user.name ?? "student"}</div>
  ),
}));

function renderNav(pathname: string) {
  usePathnameMock.mockReturnValue(pathname);
  return render(<MarketingNav />);
}

describe("the marketing navigation", () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  it("carries the mockup's four anchors and the two auth actions", () => {
    renderNav("/");

    const hrefs = Array.from(document.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );

    for (const href of ["/#how", "/#tools", "/#students", "/#faq"]) {
      expect(
        hrefs.filter((seen) => seen === href).length,
        `${href} must be linked`,
      ).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(
      screen.getAllByRole("link", { name: "Start studying" })[0],
    ).toHaveAttribute("href", "/sign-up");
  });

  it("shows the announcement strip on the landing page only", () => {
    const landing = renderNav("/");
    expect(
      landing.getByText(
        "Built for the way university students actually study.",
      ),
    ).toBeInTheDocument();
    landing.unmount();

    const elsewhere = renderNav("/pricing");
    expect(
      elsewhere.queryByText(
        "Built for the way university students actually study.",
      ),
    ).toBeNull();
  });

  it("never links a surface the rebuild cut (spec 0014 AC-1)", () => {
    const { container } = renderNav("/");

    const hrefs = Array.from(container.querySelectorAll("a")).map(
      (link) => link.getAttribute("href") ?? "",
    );

    for (const cut of [
      "/community",
      "/leaderboard",
      "/progress",
      "/feedback",
      "/affiliate",
    ]) {
      expect(
        hrefs.some((href) => href.startsWith(cut)),
        `no nav link may point at ${cut}`,
      ).toBe(false);
    }
  });

  it("sends a signed in student to the dashboard instead of the pitch", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "user-1", name: "Ada" } },
      status: "authenticated",
    });
    renderNav("/");

    expect(
      screen.getAllByRole("link", { name: "Dashboard" })[0],
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.queryAllByRole("link", { name: "Log in" })).toHaveLength(0);
  });
});
