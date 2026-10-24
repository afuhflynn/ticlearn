// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactPage, { metadata } from "@/app/(marketing)/contact/page";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The contact page (spec 0016, AC-2 and AC-6).
 *
 * The page is a server component with its own metadata. There is no form and
 * no endpoint behind it any more: the WhatsApp group is the one contact
 * channel, and the link resolves from `constants/contact.ts`.
 */
describe("the contact page (spec 0016 AC-6)", () => {
  it("carries its own title", () => {
    expect(metadata.title).toBe("Contact TiCLearn");
  });

  it("carries its own description", () => {
    expect(metadata.description).toBe(
      "Questions about TiCLearn? Reach the team on WhatsApp.",
    );
  });

  it("offers the WhatsApp group instead of a form", () => {
    const { container } = render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: "Contact Us" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Join the WhatsApp group/ }),
    ).toHaveAttribute("href", WHATSAPP_GROUP_URL);
    expect(
      container.querySelector(`a[href="${WHATSAPP_GROUP_URL}"]`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A person reads it, not a bot\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/WhatsApp is the only channel we answer from today\./),
    ).toBeInTheDocument();
  });

  it("publishes no email address and no form any more", () => {
    const { container } = render(<ContactPage />);

    expect(container.textContent).not.toMatch(/@/);
    expect(screen.queryByRole("button", { name: "Send Message" })).toBeNull();
    expect(screen.queryByLabelText("Message")).toBeNull();
  });
});
