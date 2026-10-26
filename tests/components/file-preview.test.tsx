import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { FilePreview, isImageFile } from "@/components/chat/file-preview";

/**
 * An attachment previews inside the page. Nothing here opens a new tab, and a
 * file that no longer resolves reads as a plain notice.
 */

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;

  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true }) as Response),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isImageFile", () => {
  it("reads the media type, not the file name", () => {
    expect(isImageFile("image/png")).toBe(true);
    expect(isImageFile("application/pdf")).toBe(false);
    expect(isImageFile("text/plain")).toBe(false);
  });
});

describe("an image attachment (covers: AC-7)", () => {
  it("opens a lightbox with zoom instead of a new tab", async () => {
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "https://blob.test/paper.png",
          filename: "paper.png",
          mediaType: "image/png",
          size: 2048,
        }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Preview paper.png" });
    expect(trigger).not.toHaveAttribute("target");

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("paper.png")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("150%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("never zooms out below the fitted size", async () => {
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "https://blob.test/paper.png",
          filename: "paper.png",
          mediaType: "image/png",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview paper.png" }));
    await user.click(screen.getByRole("button", { name: "Zoom out" }));

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows a plain notice when the image no longer loads", () => {
    const { container } = render(
      <FilePreview
        file={{
          url: "https://blob.test/gone.png",
          filename: "gone.png",
          mediaType: "image/png",
        }}
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    if (image) fireEvent.error(image);

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Preview gone.png" }),
    ).not.toBeInTheDocument();
  });
});

describe("a document attachment (covers: AC-7, AC-15)", () => {
  it("opens a preview sheet with the type and the size", async () => {
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "https://blob.test/paper.pdf",
          filename: "paper.pdf",
          mediaType: "application/pdf",
          size: 2048,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview paper.pdf" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("paper.pdf")).toBeInTheDocument();
    expect(screen.getByText("application/pdf · 2.0 KB")).toBeInTheDocument();
    expect(screen.getByTitle("paper.pdf")).toBeInTheDocument();
  });

  it("shows a text attachment as text, not as a download", async () => {
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "data:text/plain;base64,aGVsbG8=",
          filename: "pasted-text.txt",
          mediaType: "text/plain",
          textContent: "hello from a text file",
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Preview pasted-text.txt" }),
    );

    expect(screen.getByText("hello from a text file")).toBeInTheDocument();
  });

  it("says a file removed from storage is gone, without a broken frame", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false }) as Response),
    );
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "https://blob.test/deleted.pdf",
          filename: "deleted.pdf",
          mediaType: "application/pdf",
          size: 1024,
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Preview deleted.pdf" }),
    );

    expect(
      await screen.findByText(/This file is no longer available/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTitle("deleted.pdf")).not.toBeInTheDocument(),
    );
  });

  it("names a document type it cannot draw instead of leaving a blank sheet", async () => {
    const user = userEvent.setup();
    render(
      <FilePreview
        file={{
          url: "https://blob.test/essay.docx",
          filename: "essay.docx",
          mediaType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: 4096,
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Preview essay.docx" }),
    );

    expect(
      screen.getByText(/This document type cannot be drawn inside the page/),
    ).toBeInTheDocument();
  });
});
