import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ConnectionNotice,
  ReadFailureNotice,
} from "@/components/ui/read-notice";

describe("read notices", () => {
  it("offers a named retry for a lost connection", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ConnectionNotice onRetry={onRetry} />);

    expect(screen.getByText("The connection dropped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("disables retry while the read is being retried", () => {
    render(<ReadFailureNotice isRetrying onRetry={vi.fn()} />);

    expect(screen.getByText("This could not be loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
    expect(
      screen.getByText(/The rest of the page is still here/),
    ).toBeInTheDocument();
  });
});
