import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathMarkdown } from "@/components/math-markdown";

// String.raw keeps every backslash literal, so what the model emits is
// exactly what the test feeds the renderer: no escape layer to doubt.
describe("MathMarkdown", () => {
  it("typesets dollar-delimited math through KaTeX", () => {
    const content = String.raw`Mean $E[X] = \sum x p(x)$ done.`;
    render(<MathMarkdown content={content} />);

    expect(document.querySelector(".katex")).toBeInTheDocument();
  });

  it("normalizes backslash-paren math exactly like chat does", () => {
    const content = String.raw`Value \(\lambda = 3\) here.`;
    render(<MathMarkdown content={content} />);

    const katex = document.querySelector(".katex");
    expect(katex).toBeInTheDocument();
    expect(katex?.textContent).toContain("λ=3");
  });

  it("renders plain prose with no math output", () => {
    const { container } = render(
      <MathMarkdown content="A short summary with no formulas." />,
    );

    expect(document.querySelector(".katex")).not.toBeInTheDocument();
    expect(container.textContent).toContain("A short summary");
  });

  it("renders display equations in a sideways-scrolling block", () => {
    const content = String.raw`$$
\sum_{i=1}^{n} x_i = 1
$$`;
    const { container } = render(<MathMarkdown content={content} />);

    expect(document.querySelector(".katex-display")).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain(
      "[&_.katex-display]:overflow-x-auto",
    );
  });

  it("renders single-line display fences as inline math, never raw text", () => {
    const content = String.raw`The sum is $$\sum_{i=1}^{n} x_i = 1$$ in closed form.`;
    render(<MathMarkdown content={content} />);

    expect(document.querySelector(".katex")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("$$");
  });
});
