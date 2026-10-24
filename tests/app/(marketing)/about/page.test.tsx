// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage, { metadata } from "@/app/(marketing)/about/page";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The about page (spec 0016, AC-9). It carries a true mission and story under
 * the landing honesty rules: no invented student numbers, no community or
 * ranking surfaces, no territory claims. The closing actions are sign up and
 * WhatsApp.
 */
describe("the about page (spec 0016 AC-9)", () => {
  it("carries its own metadata", () => {
    expect(metadata.title).toBe("About TiCLearn · Tic Foundation");
    expect(metadata.description).toBe(
      "Who builds TiCLearn, and why university students in Buea and Bamenda study their own lecture notes with Tip.",
    );
  });

  it("closes with sign up and the WhatsApp group", () => {
    render(<AboutPage />);

    const startLinks = screen.getAllByRole("link", {
      name: /Create a free account/,
    });
    for (const link of startLinks) {
      expect(link).toHaveAttribute("href", "/sign-up");
    }
    expect(
      screen.getByRole("link", { name: /Join the WhatsApp group/ }),
    ).toHaveAttribute("href", WHATSAPP_GROUP_URL);
  });

  it("makes no claim the app cannot back", () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? "";

    // No invented numbers, no cut surfaces, no territory promises.
    expect(text).not.toMatch(/\bthousands\b|\b\d{3,}\b/);
    expect(text).not.toMatch(/community|leaderboard|affiliate|readiness/i);
    expect(text).not.toMatch(/central africa/i);
    expect(text).not.toMatch(/exams?\b/i);
  });
});
