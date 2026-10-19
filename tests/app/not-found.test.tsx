// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

/**
 * The 404 page (spec 0012, AC-1).
 *
 * Next embeds this page's markup into every route's payload, so it carries
 * the contact details a lost student needs.
 */
describe("the 404 page (spec 0012 AC-1)", () => {
  it("says the page was not found", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Oops! Page not found." }),
    ).toBeInTheDocument();
  });

  it("offers a way home and a way to the dashboard", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("carries the contact details a lost student needs", () => {
    render(<NotFound />);

    const phone = screen.getByRole("link", { name: "+237 222 12 34 56" });
    expect(phone).toHaveAttribute("href", "tel:+237222123456");

    const whatsapp = screen.getByRole("link", {
      name: "Join WhatsApp community",
    });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t",
    );
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  });
});
