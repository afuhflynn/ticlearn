// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FAQPage, { metadata } from "@/app/(marketing)/faq/page";
import { FAQ_ITEMS } from "@/constants";

/**
 * The FAQ page (spec 0012, AC-8, AC-9 and AC-10).
 *
 * The page is a server component with its own metadata, and every question
 * and every answer is in the first HTML.
 */
describe("the FAQ page (spec 0012 AC-9)", () => {
  it("carries its own title", () => {
    expect(metadata.title).toBe("FAQ · Cost, Data Use and Offline Access");
  });

  it("carries its own description", () => {
    expect(metadata.description).toBe(
      "Answers Cameroonian university students ask most: what TiCLearn costs, how much data it uses, and whether it works on a weak connection.",
    );
  });
});

describe("the FAQ page markup (spec 0012 AC-8)", () => {
  it("puts every question in the first HTML", () => {
    render(<FAQPage />);

    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.question)).toBeInTheDocument();
    }
  });

  it("puts every answer in the first HTML, closed or not", () => {
    render(<FAQPage />);

    for (const item of FAQ_ITEMS) {
      expect(screen.getByText(item.answer)).toBeInTheDocument();
    }
  });

  it("answers the questions the description promises", () => {
    render(<FAQPage />);

    expect(
      screen.getByText("How much data does TiCLearn use?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Can I use TiCLearn offline?")).toBeInTheDocument();
  });
});
