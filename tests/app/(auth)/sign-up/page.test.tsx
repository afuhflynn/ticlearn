// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignUpPage from "@/app/(auth)/sign-up/page";

/**
 * The sign-up agreement line (spec 0016, AC-11). A one line note under the
 * form, with both links going to the public pages. The rest of the page is
 * the existing sign-up form; only the agreement line is in scope here.
 */
vi.mock("@/lib/auth-client", () => ({
  signIn: { social: vi.fn() },
  signUp: { email: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("nuqs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("nuqs")>()),
  useQueryStates: () => [{ callbackUrl: null, error: null }, vi.fn()],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    { get: () => vi.fn(({ children }) => children ?? null) },
  ),
}));

// Touching the schema keeps the query state import honest even if the page
// never reads a param in this test.
describe("the sign-up agreement line (spec 0016 AC-11)", () => {
  it("agrees to the Terms and the Privacy policy, linked to the public pages", async () => {
    render(<SignUpPage />);

    const note = await screen.findByText(
      /By creating an account you agree to our/,
    );
    expect(note).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });
});
