// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactPage, { metadata } from "@/app/(marketing)/contact/page";

/**
 * The contact page (spec 0012, AC-8, AC-9 and AC-10).
 *
 * The page is a server component with its own metadata. The address block is
 * static server markup and the form is the one client island.
 */
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("the contact page (spec 0012 AC-9)", () => {
  it("carries its own title", () => {
    expect(metadata.title).toBe("Contact TiCLearn");
  });

  it("carries its own description", () => {
    expect(metadata.description).toBe(
      "Reach TiCLearn on WhatsApp or by phone, or send the team a message from this form.",
    );
  });
});

describe("the contact page markup (spec 0012 AC-8)", () => {
  it("shows the contact details in the first HTML", () => {
    render(<ContactPage />);

    expect(
      screen.getByRole("heading", { name: "Contact Us" }),
    ).toBeInTheDocument();
    expect(screen.getByText("hello@ticlearn.com")).toBeInTheDocument();
    expect(screen.getByText("Cameroon")).toBeInTheDocument();
  });

  it("shows the form in the first HTML", () => {
    render(<ContactPage />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Message" }),
    ).toBeInTheDocument();
  });
});
