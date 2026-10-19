// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/markdown";
import { Attachment } from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/ui/file-drop";

describe("primitives", () => {
  it("renders Button", () => {
    render(<Button>Click</Button>);
    expect(screen.getByText("Click")).toBeInTheDocument();
  });
  it("renders FileDrop", () => {
    render(<FileDrop onFiles={() => {}} />);
    expect(screen.getByText("Choose files")).toBeInTheDocument();
  });
  it("renders Attachment", () => {
    render(<Attachment filename="note.pdf" />);
    expect(screen.getByText("note.pdf")).toBeInTheDocument();
  });
  it("renders Markdown", () => {
    const { container } = render(<Markdown>{"hello"}</Markdown>);
    expect(container.textContent).toContain("hello");
  });
});
