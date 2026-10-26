// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInFormWrapper } from "@/app/(auth)/sign-in/sign-in-form";
import { SignUpFormWrapper } from "@/app/(auth)/sign-up/sign-up-form";
import { VerifyEmailFormWrapper } from "@/app/(auth)/verify-email/verify-email-form";

/**
 * The three auth forms are now client islands behind a server wrapper, from
 * spec 0021 AC-1. The metadata is the wrapper's job and is covered in
 * `tests/app/public-pages-metadata.test.ts`; here the subject is what the
 * student sees and what the form refuses to send.
 */
const signInEmail = vi.hoisted(() => vi.fn());
const signUpEmail = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const sendVerificationOTP = vi.hoisted(() => vi.fn());
const verifyEmailOTP = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  signIn: { email: signInEmail, social: vi.fn() },
  signUp: { email: signUpEmail },
  useSession: () => ({ data: null, isPending: false }),
  sendVerificationOTP,
  verifyEmailOTP,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("nuqs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("nuqs")>()),
  useQueryStates: () => [
    { callbackUrl: null, error: null, email: null } as Record<string, unknown>,
    vi.fn(),
  ],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
/**
 * One stable component per motion tag. A fresh component on every render would
 * remount the subtree, which drops focus from the field the test is typing in.
 */
vi.mock("framer-motion", () => {
  const cache = new Map<PropertyKey, unknown>();
  return {
    motion: new Proxy(
      {},
      {
        get(_target, tag) {
          if (!cache.has(tag)) {
            cache.set(
              tag,
              ({ children }: { children?: React.ReactNode }) =>
                children ?? null,
            );
          }
          return cache.get(tag);
        },
      },
    ),
  };
});

beforeEach(() => {
  signInEmail.mockReset();
  signUpEmail.mockReset();
  push.mockReset();
  sendVerificationOTP.mockReset();
  verifyEmailOTP.mockReset();
});

describe("the sign up form (AC-1)", () => {
  async function fillToThePasswordFields(password: string, confirm: string) {
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Full Name"), "Awa Nfor");
    await user.type(screen.getByLabelText("Email"), "awa@example.com");
    await user.type(screen.getByLabelText("Password"), password);
    await user.type(screen.getByLabelText("Confirm Password"), confirm);

    return user;
  }

  it("refuses a password shorter than eight characters and sends nothing", async () => {
    render(<SignUpFormWrapper />);
    const user = await fillToThePasswordFields("short1", "short1");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match and sends nothing", async () => {
    render(<SignUpFormWrapper />);
    const user = await fillToThePasswordFields("password123", "password124");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("sends the student to the code screen once the account is created", async () => {
    signUpEmail.mockResolvedValue({});
    render(<SignUpFormWrapper />);
    const user = await fillToThePasswordFields("password123", "password123");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(signUpEmail).toHaveBeenCalledWith({
      email: "awa@example.com",
      password: "password123",
      name: "Awa Nfor",
    });
    expect(push).toHaveBeenCalledWith("/verify-email?email=awa%40example.com");
  });

  it("shows what the server said when the sign up fails", async () => {
    signUpEmail.mockResolvedValue({
      error: { message: "An account with this email already exists" },
    });
    render(<SignUpFormWrapper />);
    const user = await fillToThePasswordFields("password123", "password123");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(
      await screen.findByText("An account with this email already exists"),
    ).toBeInTheDocument();
  });

  it("gives the show password control an accessible name", () => {
    render(<SignUpFormWrapper />);

    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeInTheDocument();
  });
});

describe("the sign in form (AC-1)", () => {
  it("turns the password field readable", async () => {
    render(<SignInFormWrapper />);
    const user = userEvent.setup();
    const password = screen.getByLabelText("Password");
    // The toggle sits beside the field it belongs to. It is found by position
    // here because its missing accessible name is covered by its own test.
    const toggle = password.parentElement?.querySelector("button");

    expect(toggle).not.toBeNull();
    expect(password).toHaveAttribute("type", "password");
    await user.click(toggle as HTMLButtonElement);
    expect(password).toHaveAttribute("type", "text");
  });

  it("offers a way forward when the email is not verified yet", async () => {
    signInEmail.mockImplementation(async ({ fetchOptions }) => {
      fetchOptions?.onError?.({
        error: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" },
      });
    });
    render(<SignInFormWrapper />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "awa@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText("Please verify your email first"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Verify Email/i }),
    ).toBeInTheDocument();
  });

  it("gives the show password control an accessible name", () => {
    render(<SignInFormWrapper />);

    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeInTheDocument();
  });
});

describe("the verify email form (AC-1)", () => {
  it("keeps only six digits in the code field", async () => {
    render(<VerifyEmailFormWrapper />);
    const user = userEvent.setup();
    const field = screen.getByLabelText("Verification Code");

    await user.type(field, "12ab34cd56");

    expect(field).toHaveValue("123456");
  });

  it("keeps the verify button out of reach until six digits are in", async () => {
    render(<VerifyEmailFormWrapper />);
    const user = userEvent.setup();
    const field = screen.getByLabelText("Verification Code");
    const submit = screen.getByRole("button", { name: "Verify Email" });

    expect(submit).toBeDisabled();
    await user.type(field, "12345");
    expect(submit).toBeDisabled();
    await user.type(field, "6");
    expect(submit).toBeEnabled();
  });
});
