// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "@/app/(marketing)/page";
import { FREE_LIMITS } from "@/lib/plan-limits";
import { canonicalUrl } from "@/lib/seo";

/**
 * The landing page (spec 0015).
 *
 * The layout follows the approved mockup section for section. The page is made
 * of server components, the tutor is Tip, the frames hold real screenshots, and
 * the free limits come from `lib/plan-limits.ts`.
 */
describe("the landing page (spec 0015)", () => {
  it("shows the headline in the first HTML", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Make your course notes make sense.",
    );
  });

  it("has no question box", () => {
    render(<HomePage />);

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders the mockup's sections in order", () => {
    render(<HomePage />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent ?? "");

    expect(headings).toEqual([
      "Your course materials first",
      "Understand, don't just memorize",
      "Feedback you can act on",
      "One place to move from confusion to practice.",
      "A simple cycle for better learning.",
      "Made for real coursework.",
      "Your lecturer's notes are the starting point.",
      "Frequently asked questions",
      "Study with more direction.",
    ]);
  });

  it("names the three jobs", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: "1. Ask Tip about what you're studying",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "2. Turn a topic into focused practice",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "3. See what to revisit next" }),
    ).toBeInTheDocument();
  });

  it("says what is free with the real limits, paid over Mobile Money", () => {
    render(<HomePage />);

    // The reset scope must match enforcement: notes and quizzes are lifetime
    // counts in `app/api/notes/route.ts` and `app/api/quizzes/generate/route.ts`,
    // so "a day" must attach to Tip alone.
    expect(
      screen.getByText(
        `Free to start: ${FREE_LIMITS.pdfUploads} notes and ${FREE_LIMITS.quizGenerations} quizzes to try, plus ${FREE_LIMITS.aiTutorMessages} messages to Tip a day.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pay with MTN Mobile Money or Orange Money when you are ready. No card needed.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See the plans/ })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("shows the real screenshots with descriptive alt text", () => {
    render(<HomePage />);

    expect(
      screen.getByAltText(/A note in TiCLearn for a second year/),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/Tip quoting a paragraph from a second year/),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/A quiz question generated from the Operating/),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/A finished quiz attempt in TiCLearn/),
    ).toBeInTheDocument();
  });

  it("links every in-page anchor and both calls to action", () => {
    render(<HomePage />);

    const startLinks = screen.getAllByRole("link", {
      name: /Start studying/,
    });
    expect(startLinks).toHaveLength(2);
    for (const link of startLinks) {
      expect(link).toHaveAttribute("href", "/sign-up");
    }
    expect(
      screen.getByRole("link", { name: "Explore how it works" }),
    ).toHaveAttribute("href", "/#how");
    expect(screen.getByRole("link", { name: "Upload file" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("answers exactly the six curated questions from FAQ_ITEMS (spec 0016 AC-4)", () => {
    render(<HomePage />);

    for (const question of [
      "What is TiCLearn?",
      "Is TiCLearn free to use?",
      "What payment methods do you accept?",
      "How much data does TiCLearn use?",
      "Can I use TiCLearn offline?",
      "Is my data secure?",
    ]) {
      expect(
        screen.getByRole("button", { name: question }),
      ).toBeInTheDocument();
    }

    // The landing shows only the curated six, not the full set of 18.
    expect(screen.getAllByRole("button", { name: /\?$/ })).toHaveLength(6);
  });

  it("closes with a WhatsApp row beside the CTA band (spec 0016 AC-4)", () => {
    render(<HomePage />);

    expect(screen.getByText("More questions?")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Join the WhatsApp group/ }),
    ).toBeInTheDocument();
  });

  it("makes no claim the app cannot keep", () => {
    render(<HomePage />);

    expect(screen.queryByText(/CFA/)).toBeNull();
    expect(screen.queryByText(/\+237/)).toBeNull();
    expect(screen.queryByText(/\d+\s*%/)).toBeNull();
    expect(screen.queryByText(/readiness/i)).toBeNull();
    expect(screen.queryByText(/leaderboard/i)).toBeNull();
  });

  it("carries its own metadata", () => {
    expect(metadata.title).toBe("TiCLearn · Make your course notes make sense");
    expect(metadata.alternates?.canonical).toBe(canonicalUrl("/"));
  });

  it("resolves every in-page anchor the nav and footer rely on (spec 0015 AC-5)", () => {
    const { container } = render(<HomePage />);

    // These are the four anchors the nav links to, plus `#free`, which the
    // footer's What is free link and the CTA band anchor depend on.
    for (const id of ["how", "tools", "students", "faq", "free"]) {
      expect(
        container.querySelector(`#${id}`),
        `the page must carry a section with id ${id}`,
      ).not.toBeNull();
    }
  });
});
