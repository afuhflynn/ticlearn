import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

/**
 * The marketing footer (spec 0014, AC-9; spec 0015, AC-5).
 *
 * The footer is one of the pages that must read the single WhatsApp constant,
 * and every link it prints must target a route that ships after the cut.
 */
describe("the marketing footer (spec 0014 AC-9)", () => {
  it("points the WhatsApp link at the one contact constant", () => {
    const { container } = render(<MarketingFooter />);

    const whatsappLinks = Array.from(container.querySelectorAll("a")).filter(
      (link) => link.getAttribute("href") === WHATSAPP_GROUP_URL,
    );
    expect(
      whatsappLinks.length,
      "a link must carry the WhatsApp group URL",
    ).toBeGreaterThan(0);
    expect(whatsappLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("names the WhatsApp link with the shared label", () => {
    const { container } = render(<MarketingFooter />);

    expect(container.textContent).toContain(WHATSAPP_GROUP_LABEL);
  });
});

describe("the footer links (spec 0015 AC-5)", () => {
  it("lists the product, support and legal destinations", () => {
    const { container } = render(<MarketingFooter />);

    const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );

    for (const href of [
      "/#how",
      "/#tools",
      "/#free",
      "/pricing",
      "/faq",
      "/contact",
      "/about",
      "/terms",
      "/privacy",
    ]) {
      expect(hrefs, `${href} must be in the footer`).toContain(href);
    }
  });

  it("never links a surface the rebuild cut", () => {
    const { container } = render(<MarketingFooter />);

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
        `no footer link may point at ${cut}`,
      ).toBe(false);
    }
  });

  it("prints no phone number", () => {
    const { container } = render(<MarketingFooter />);

    expect(container.textContent).not.toMatch(/\+237/);
  });
});
