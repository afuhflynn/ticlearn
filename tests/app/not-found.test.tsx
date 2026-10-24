// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

/**
 * The 404 page (spec 0014, AC-10).
 *
 * Next embeds this page's markup into every route's payload, so it says what
 * may have happened, gives a way back into the app, and gives a way to reach a
 * human. It carries no phone number.
 */
describe("the 404 page (spec 0014 AC-10)", () => {
  it("says the page was not found", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "That page is not here." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The link may be old, or the page may have moved."),
    ).toBeInTheDocument();
  });

  it("offers a way home and a way to start", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "Start with one note" }),
    ).toHaveAttribute("href", "/sign-up");
  });

  it("carries the WhatsApp link a lost student needs and no phone number", () => {
    render(<NotFound />);

    const whatsapp = screen.getByRole("link", {
      name: "Join the WhatsApp group",
    });
    expect(whatsapp).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t",
    );
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.queryByRole("link", { name: /\+237/ })).toBeNull();
  });
});
