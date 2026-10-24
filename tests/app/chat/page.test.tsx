import type { JSX } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatLandingPage from "@/app/chat/page";

/**
 * The chat page's `q` handling (spec 0014, AC-16).
 *
 * A question typed elsewhere travels as `?q=`. The page passes it to Tip's
 * landing as the composer's initial text: nothing is sent until the student
 * presses send, and no question is sent twice.
 *
 * The page is an async server component, so this reads the element it
 * returns: the contract is the props handed to Tip's landing.
 */
vi.mock("@/components/chat/chat-landing", () => ({
  ChatLanding: () => null,
}));

describe("the chat page reading q (spec 0014 AC-16)", () => {
  it("hands the question to the composer as its initial text", async () => {
    const element = (await ChatLandingPage({
      searchParams: Promise.resolve({ q: "What is a semaphore?" }),
    })) as JSX.Element;

    expect(element.props).toEqual({
      noteId: null,
      initialQuestion: "What is a semaphore?",
    });
  });

  it("passes a note reference through and leaves the question empty", async () => {
    const element = (await ChatLandingPage({
      searchParams: Promise.resolve({ note: "note-1" }),
    })) as JSX.Element;

    expect(element.props).toEqual({
      noteId: "note-1",
      initialQuestion: null,
    });
  });

  it("opens plain when the URL carries nothing", async () => {
    const element = (await ChatLandingPage({
      searchParams: Promise.resolve({}),
    })) as JSX.Element;

    expect(element.props).toEqual({
      noteId: null,
      initialQuestion: null,
    });
  });
});
