// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/marketing/contact-form";

/**
 * The one client island on the contact page (spec 0012, AC-8).
 *
 * The address block beside it is static server markup, so everything the
 * student can do lives in this form.
 */
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })),
  );
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ada Tester");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Subject"), "A question");
  await user.type(screen.getByLabelText("Message"), "How do I pay?");
  await user.click(screen.getByRole("button", { name: "Send Message" }));
}

describe("the contact form (spec 0012 AC-8)", () => {
  it("posts the message to the contact endpoint", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Ada Tester",
      email: "ada@example.com",
      subject: "A question",
      message: "How do I pay?",
    });
  });

  it("tells the student the message arrived and empties the form", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Message sent! We'll get back to you soon.",
      );
    });
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("tells the student when the message was not accepted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ success: false, error: "Message rejected" }),
      })),
    );
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Message rejected");
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("tells the student when the request could not be made", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillAndSubmit(user);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      );
    });
  });

  it("gives every field a label a student can read", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
