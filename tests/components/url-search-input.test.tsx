// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UrlSearchInput } from "@/components/url-search-input";

function setup(value: string, onCommit: (next: string) => void) {
  const user = userEvent.setup({ delay: null });
  render(
    <UrlSearchInput
      value={value}
      onCommit={onCommit}
      placeholder="Search users..."
      ariaLabel="Search users"
    />,
  );
  return { user, box: screen.getByRole("textbox", { name: "Search users" }) };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("UrlSearchInput", () => {
  it("exposes the search box under an accessible name", () => {
    const onCommit = vi.fn();
    setup("", onCommit);
    expect(
      screen.getByRole("textbox", { name: "Search users" }),
    ).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("keeps typing local and commits on a trailing pause", async () => {
    const onCommit = vi.fn();
    const { user, box } = setup("", onCommit);
    await user.type(box, "ada");
    expect(box).toHaveValue("ada");
    expect(onCommit).not.toHaveBeenCalled();
    await pause(400);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("ada");
  });

  it("commits once for a burst of keystrokes", async () => {
    const onCommit = vi.fn();
    const { user, box } = setup("", onCommit);
    await user.type(box, "abcdef");
    await pause(400);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("abcdef");
  });

  it("flushes a pending value on Enter without waiting", async () => {
    const onCommit = vi.fn();
    const { user, box } = setup("", onCommit);
    await user.type(box, "ada");
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("ada");
  });

  it("flushes a pending value on blur", async () => {
    const onCommit = vi.fn();
    const { user, box } = setup("", onCommit);
    await user.type(box, "ada");
    box.blur();
    await pause(50);
    expect(onCommit).toHaveBeenCalledWith("ada");
  });

  it("reverts to the URL value on Escape without committing", async () => {
    const onCommit = vi.fn();
    const { user, box } = setup("ada", onCommit);
    await user.type(box, "XYZ");
    expect(box).toHaveValue("adaXYZ");
    await user.keyboard("{Escape}");
    expect(box).toHaveValue("ada");
    await pause(400);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("picks up an outside value when idle", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <UrlSearchInput value="" onCommit={onCommit} ariaLabel="Search users" />,
    );
    rerender(
      <UrlSearchInput
        value="shared link"
        onCommit={onCommit}
        ariaLabel="Search users"
      />,
    );
    expect(screen.getByRole("textbox", { name: "Search users" })).toHaveValue(
      "shared link",
    );
  });
});
