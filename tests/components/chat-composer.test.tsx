import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ChatComposer } from "@/components/chat/chat-composer";
import { CHAT_CAPABILITY_LINE } from "@/components/chat/constants";

/**
 * The composer is the one place a student writes. These tests drive it the way
 * a phone and a laptop do, and assert only what the student can perceive.
 */

const sessionState = vi.hoisted(() => ({
  current: null as null | { user: { id: string } },
}));

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: sessionState.current }),
}));

vi.mock("@vercel/blob/client", () => ({ upload: uploadMock }));

let pointerCoarse = false;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("coarse") ? pointerCoarse : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

beforeEach(() => {
  pointerCoarse = false;
  sessionState.current = { user: { id: "user-1" } };
  uploadMock.mockReset();
  uploadMock.mockResolvedValue({ url: "https://blob.test/uploaded-file" });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderComposer(
  props: Partial<ComponentProps<typeof ChatComposer>> = {},
) {
  const onSubmit = vi.fn();
  const onStop = vi.fn();
  const view = render(
    <ChatComposer
      draftKey="conversation-1"
      onSubmit={onSubmit}
      onStop={onStop}
      status="ready"
      {...props}
    />,
  );
  return { ...view, onSubmit, onStop };
}

const box = () => screen.getByRole("textbox", { name: "Message Tip" });

const fileInput = () =>
  document.getElementById("chat-attachment-input") as HTMLInputElement;

const imageFile = (name = "paper.png", bytes = 2048) =>
  new File(["x".repeat(bytes)], name, { type: "image/png" });

describe("the composer capability line (covers: AC-14)", () => {
  it("names what Tip can already use when nothing is attached", () => {
    renderComposer();

    expect(screen.getByText(CHAT_CAPABILITY_LINE)).toBeInTheDocument();
  });

  it("shows the reason instead of the capability line when chat is closed", () => {
    renderComposer({
      disabled: true,
      disabledReason: "Your daily messages are used up.",
    });

    expect(box()).toBeDisabled();
    expect(
      screen.getByPlaceholderText("Your daily messages are used up."),
    ).toBeInTheDocument();
  });
});

describe("sending and stopping (covers: AC-5, AC-6)", () => {
  it("keeps send disabled until there is something to send", async () => {
    const user = userEvent.setup();
    renderComposer();

    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();

    await user.type(box(), "Explain osmosis");

    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("sends on Enter with a fine pointer and clears the box", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();

    await user.type(box(), "Explain osmosis");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      text: "Explain osmosis",
      files: [],
    });
    expect(box()).toHaveValue("");
  });

  it("clears the box at once, before the answer finishes", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    render(
      <ChatComposer
        draftKey="conversation-1"
        onSubmit={onSubmit}
        status="ready"
      />,
    );

    await user.type(box(), "Explain osmosis");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    // The answer has not arrived, and the box is already empty, so the message
    // on screen is the message that was sent.
    expect(box()).toHaveValue("");

    finish();
  });

  it("inserts a newline on Shift Enter instead of sending", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();

    await user.type(box(), "First line");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(box(), "Second line");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(box()).toHaveValue("First line\nSecond line");
  });

  it("inserts a newline on Enter with a coarse pointer", async () => {
    pointerCoarse = true;
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();

    await user.type(box(), "Explain osmosis");
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(box()).toHaveValue("Explain osmosis\n");
  });

  it("turns send into a reachable stop control while an answer streams", async () => {
    const user = userEvent.setup();
    const { onStop } = renderComposer({ status: "streaming" });

    expect(
      screen.queryByRole("button", { name: "Send message" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stop answering" }));

    expect(onStop).toHaveBeenCalledOnce();
  });

  it("stops the answer when the form is submitted mid stream", async () => {
    const user = userEvent.setup();
    const { onStop } = renderComposer({ status: "streaming" });

    await user.type(box(), "wait");
    await user.keyboard("{Enter}");

    expect(onStop).toHaveBeenCalledOnce();
  });
});

describe("attachments (covers: AC-7, AC-9)", () => {
  it("shows each attachment with its size and an exact count", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();

    await user.upload(fileInput(), [imageFile()]);

    expect(await screen.findByText("paper.png")).toBeInTheDocument();
    await waitFor(() => expect(uploadMock).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByText("2.0 KB")).toBeInTheDocument());
    expect(screen.getByText("1 attachment.")).toBeInTheDocument();

    await user.type(box(), "Look at this");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].files).toEqual([
      {
        type: "file",
        mediaType: "image/png",
        filename: "paper.png",
        url: "https://blob.test/uploaded-file",
      },
    ]);
  });

  it("removes one attachment on its own and updates the count", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.upload(fileInput(), [
      imageFile("page-1.png"),
      imageFile("page-2.png"),
    ]);
    await screen.findByText("page-1.png");
    expect(screen.getByText("2 attachments.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove page-1.png" }));

    expect(screen.queryByText("page-1.png")).not.toBeInTheDocument();
    expect(screen.getByText("page-2.png")).toBeInTheDocument();
    expect(screen.getByText("1 attachment.")).toBeInTheDocument();
  });

  it("collapses overflow into a plus N chip that shows the rest", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.upload(
      fileInput(),
      Array.from({ length: 5 }, (_, index) =>
        imageFile(`page-${index + 1}.png`),
      ),
    );
    await screen.findByText("page-1.png");

    expect(screen.queryByText("page-4.png")).not.toBeInTheDocument();
    expect(screen.getByText("5 attachments.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /more attachments/ }));

    expect(screen.getByText("page-4.png")).toBeInTheDocument();
    expect(screen.getByText("page-5.png")).toBeInTheDocument();
  });

  it("blocks send after a failed upload and recovers on retry", async () => {
    const user = userEvent.setup();
    uploadMock.mockRejectedValueOnce(new Error("network down"));
    renderComposer();

    await user.upload(fileInput(), [imageFile()]);

    expect(
      await screen.findByText(
        "Upload failed. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(
      screen.getByText("Retry or remove the failed file before sending."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry paper.png" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send message" }),
      ).toBeEnabled(),
    );
  });

  it("clears the failed notice once the retry succeeds", async () => {
    const user = userEvent.setup();
    uploadMock.mockRejectedValueOnce(new Error("network down"));
    renderComposer();

    await user.upload(fileInput(), [imageFile()]);
    await screen.findByText(
      "Upload failed. Check your connection and try again.",
    );

    await user.click(screen.getByRole("button", { name: "Retry paper.png" }));

    await waitFor(() =>
      expect(screen.queryByText(/Upload failed/)).not.toBeInTheDocument(),
    );
  });

  it("asks the student to sign in again instead of uploading without a session", async () => {
    sessionState.current = null;
    const user = userEvent.setup();
    renderComposer();

    await user.upload(fileInput(), [imageFile()]);

    expect(
      await screen.findByText("Sign in again to attach files."),
    ).toBeInTheDocument();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("keeps the composer usable while a file uploads", async () => {
    const user = userEvent.setup();
    uploadMock.mockReturnValue(new Promise(() => {}));
    renderComposer();

    await user.upload(fileInput(), [imageFile()]);

    expect(await screen.findByText(/· 0%/)).toBeInTheDocument();
    await user.type(box(), "Still typing");
    expect(box()).toHaveValue("Still typing");
  });
});

describe("long pastes and drafts (covers: AC-10, AC-11)", () => {
  it("attaches a paste over the limit and puts it back on request", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(box());
    await user.paste("a".repeat(7000));

    expect(await screen.findByText("pasted-text.txt")).toBeInTheDocument();
    expect(
      screen.getByText(
        /That paste was 7,000 characters, so it is attached as a text file\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Show in text field" }),
    );

    expect(box()).toHaveValue("a".repeat(7000));
    expect(screen.queryByText("pasted-text.txt")).not.toBeInTheDocument();
  });

  it("restores an unsent draft for the same conversation", async () => {
    window.sessionStorage.setItem(
      "ticlearn-chat-draft:conversation-1",
      "half a question",
    );
    renderComposer();

    await waitFor(() => expect(box()).toHaveValue("half a question"));
  });

  it("writes the draft to the tab session and clears it on send", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderComposer();

    await user.type(box(), "Explain osmosis");
    expect(
      window.sessionStorage.getItem("ticlearn-chat-draft:conversation-1"),
    ).toBe("Explain osmosis");

    await user.keyboard("{Enter}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(
      window.sessionStorage.getItem("ticlearn-chat-draft:conversation-1"),
    ).toBeNull();
  });

  it("returns a rejected text file to the box with its character count", async () => {
    renderComposer({
      restore: {
        text: "hello",
        notice: "That text file could not be read, so it is back in the box.",
        nonce: 1,
      },
    });

    await waitFor(() => expect(box()).toHaveValue("hello"));
    expect(
      screen.getByText(/That text file could not be read/),
    ).toBeInTheDocument();
    expect(screen.getByText(/5 characters in the box\./)).toBeInTheDocument();
  });
});

describe("prefill (covers: AC-8, AC-21)", () => {
  it("fills the box from a starter without sending", async () => {
    const { rerender, onSubmit } = renderComposer();

    rerender(
      <ChatComposer
        draftKey="conversation-1"
        onSubmit={onSubmit}
        prefill={{ text: "Quiz me on this", nonce: 1 }}
        status="ready"
      />,
    );

    await waitFor(() => expect(box()).toHaveValue("Quiz me on this"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("the composer and assistive technology (covers: AC-18)", () => {
  it("gives every visible control an accessible name", () => {
    renderComposer({ status: "streaming" });

    expect(
      screen.getByRole("button", { name: "Attach files" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop answering" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Message Tip" }),
    ).toBeInTheDocument();
  });
});
