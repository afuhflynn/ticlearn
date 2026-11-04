import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/ui/page-header";

describe("PageHeader (covers: AC-2)", () => {
  it("renders the title as the page heading with helper text", () => {
    render(
      <PageHeader
        title="Upload notes"
        description="Add a file, then turn it into practice."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Upload notes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add a file, then turn it into practice."),
    ).toBeInTheDocument();
  });

  it("renders actions beside the title when given", () => {
    render(
      <PageHeader
        title="Quizzes"
        actions={<button type="button">New quiz</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "New quiz" }),
    ).toBeInTheDocument();
  });

  it("renders no actions slot when none are given", () => {
    const { container } = render(<PageHeader title="Settings" />);

    expect(
      container.querySelector('[data-slot="page-header-actions"]'),
    ).toBeNull();
  });
});
