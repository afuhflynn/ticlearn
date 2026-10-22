import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const error = new Error("database unavailable");

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("route error page", () => {
  it("explains the failure and lets the student retry or go home", async () => {
    const reset = vi.fn();
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<ErrorPage error={error} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("global error page", () => {
  it("renders a retry action without depending on the application shell", async () => {
    const reset = vi.fn();
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<GlobalError error={error} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
