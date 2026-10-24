// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "@/app/(marketing)/privacy/page";
import { LEGAL_LAST_UPDATED } from "@/constants";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The privacy page (spec 0016, AC-8). It discloses in plain language: what is
 * collected (account, uploaded notes, chats with Tip, usage, device), that
 * note and chat text reach AI providers, the real third party list, and that
 * deletion requests start through WhatsApp. No encryption at rest claim, no
 * promise to notify about changes, one authored date shared with the Terms.
 */
describe("the privacy page (spec 0016 AC-8)", () => {
  it("carries its own metadata", () => {
    expect(metadata.title).toBe("Privacy Policy · TiCLearn");
    expect(metadata.description).toBe(
      "How TiCLearn handles your account, your notes and your chats, and who processes them.",
    );
  });

  it("discloses what is collected and the AI processing", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";

    for (const word of [
      "Account",
      "Uploaded notes",
      "Chats with Tip",
      "Usage",
      "Device",
    ]) {
      expect(text).toContain(word);
    }
    expect(text).toMatch(/AI (service )?provider/i);
    expect(text).toMatch(/UploadThing|Neon|Fapshi|Sentry/i);
    expect(text).toMatch(/WhatsApp group/i);

    // No claim the product cannot back.
    expect(text).not.toMatch(/encrypt/i);
    expect(text).not.toMatch(/notify you of (significant )?changes/i);
    expect(text).not.toMatch(/@/); // no email contact line
  });

  it("shares the one authored date with the Terms", () => {
    render(<PrivacyPage />);

    expect(screen.getByText(LEGAL_LAST_UPDATED)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /TiCLearn WhatsApp group/ }),
    ).toHaveAttribute("href", WHATSAPP_GROUP_URL);
  });
});
