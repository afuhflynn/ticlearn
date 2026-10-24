// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage, { metadata } from "@/app/(marketing)/terms/page";
import { LEGAL_LAST_UPDATED } from "@/constants";
import { WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The terms page (spec 0016, AC-7). It carries the minimal money stance:
 * advance billing at the prices shown at checkout, MTN MoMo and Orange Money
 * named, no billing period promise, no refund policy, no affiliate section
 * and no price figure. The contact section points to the WhatsApp group and
 * the date is the one authored string both legal pages share.
 */
describe("the terms page (spec 0016 AC-7)", () => {
  it("carries its own metadata", () => {
    expect(metadata.title).toBe("Terms of Service · TiCLearn");
    expect(metadata.description).toBe(
      "The rules for using TiCLearn: accounts, uploads, chats and paying with MTN MoMo and Orange Money.",
    );
  });

  it("takes the minimal money stance and names the Mobile Money providers", () => {
    const { container } = render(<TermsPage />);
    const text = container.textContent ?? "";

    expect(text).toMatch(/bill in advance/i);
    expect(text).toMatch(/prices shown at checkout/i);
    expect(text).toMatch(/MTN MoMo/);
    expect(text).toMatch(/Orange Money/);

    // No billing period promise, no refund policy, no affiliate section,
    // and no price figure anywhere.
    expect(text).not.toMatch(/monthly|weekly|annual|semester/i);
    expect(text).not.toMatch(/refund policy|money-back|money back/i);
    expect(text).not.toMatch(/affiliate/i);
    expect(text).not.toMatch(/\d[\d,]*\s*(CFA|FCFA|XAF)/i);
  });

  it("points contact at the WhatsApp group and shares the one authored date", () => {
    const { container } = render(<TermsPage />);

    expect(
      screen.getByRole("link", { name: /TiCLearn WhatsApp group/ }),
    ).toHaveAttribute("href", WHATSAPP_GROUP_URL);
    expect(screen.getByText(LEGAL_LAST_UPDATED)).toBeInTheDocument();
    // The date is authored as "day month year", never the en-US rendered
    // clock format the page used to print.
    expect(container.textContent).not.toMatch(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
  });
});
