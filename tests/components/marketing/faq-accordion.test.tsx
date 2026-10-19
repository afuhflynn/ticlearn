// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/constants";

/**
 * The one client island on the FAQ page (spec 0012, AC-8).
 *
 * Every answer is mounted from the start, so a student on a bad connection and
 * a crawler both read the whole page without a tap.
 */
describe("the FAQ accordion (spec 0012 AC-8)", () => {
  it("puts every question in the first HTML", () => {
    render(<FaqAccordion items={FAQ_ITEMS} />);

    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it("puts every answer in the first HTML, closed or not", () => {
    render(<FaqAccordion items={FAQ_ITEMS} />);

    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.answer)).toBeInTheDocument();
    }
  });

  it("starts with every answer closed", () => {
    render(<FaqAccordion items={FAQ_ITEMS} />);

    for (const item of FAQ_ITEMS) {
      expect(
        screen.getByRole("button", { name: item.question }),
      ).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens the answer a student taps", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={FAQ_ITEMS} />);
    const trigger = screen.getByRole("button", { name: FAQ_ITEMS[0].question });

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the answer again when the student taps it twice", async () => {
    const user = userEvent.setup();
    render(<FaqAccordion items={FAQ_ITEMS} />);
    const trigger = screen.getByRole("button", { name: FAQ_ITEMS[0].question });

    await user.click(trigger);
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
