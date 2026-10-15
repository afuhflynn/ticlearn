// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/app/(admin)/admin/users/page";

// jsdom lacks the pointer capture and scroll APIs that Radix Select
// calls on open.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const searchState = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchState.current,
}));

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  levelOfStudy: string | null;
  onboardingCompleted: boolean | null;
  onboardingSkipped: boolean | null;
  createdAt: string;
  notesCount: number;
  quizzesCount: number;
  attemptsCount: number;
};

const userRow = (id: string, name: string, role = "USER"): AdminUser => ({
  id,
  name,
  email: `${id}@example.com`,
  image: null,
  role,
  levelOfStudy: "Year 2",
  onboardingCompleted: true,
  onboardingSkipped: false,
  createdAt: new Date("2026-01-05T10:00:00Z").toISOString(),
  notesCount: 1,
  quizzesCount: 2,
  attemptsCount: 3,
});

const useAdminUsersMock = vi.hoisted(() =>
  vi.fn((_params: unknown) => ({
    users: [userRow("u1", "Ada Tester"), userRow("u2", "Bob Tester")],
    total: 26,
    totalPages: 2,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
);

vi.mock("@/hooks/useAdmin", () => ({
  useAdminUsers: useAdminUsersMock,
}));

const seen: string[] = [];

function renderPage(initial: string) {
  seen.length = 0;
  searchState.current = new URLSearchParams(
    initial.startsWith("?") ? initial.slice(1) : initial,
  );
  useAdminUsersMock.mockClear();
  const user = userEvent.setup({ delay: null });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <AdminUsersPage />
    </QueryClientProvider>,
    {
      wrapper: withNuqsTestingAdapter({
        searchParams: initial,
        hasMemory: true,
        resetUrlUpdateQueueOnMount: false,
        onUrlUpdate: (event) => {
          searchState.current = event.searchParams;
          seen.push(event.queryString);
        },
      }),
    },
  );
  return { user, ...utils };
}

describe("AdminUsersPage URL state (spec 0007 thin thread)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders rows with a clean URL when nothing is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invites: [] }),
        }),
      ),
    );
    renderPage("");
    expect(await screen.findByText("Ada Tester")).toBeInTheDocument();
    expect(useAdminUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "USER", page: 1 }),
    );
    expect(seen).toEqual([]);
  });

  it("commits search text to q on a trailing pause", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invites: [] }),
        }),
      ),
    );
    const { user } = renderPage("");
    const box = await screen.findByRole("textbox", { name: "Search users" });
    await user.type(box, "ada");
    await vi.waitFor(
      () => {
        expect(seen.some((query) => query.includes("q=ada"))).toBe(true);
      },
      { timeout: 3000 },
    );
    expect(useAdminUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "ada" }),
    );
  });

  it("resets to the first page in the same update as a filter change", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invites: [] }),
        }),
      ),
    );
    const { user } = renderPage("?page=2");
    expect(await screen.findByText("Ada Tester")).toBeInTheDocument();
    expect(useAdminUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "Admins" }));
    await vi.waitFor(
      () => {
        expect(
          seen.some(
            (query) => query.includes("role=ADMIN") && !query.includes("page="),
          ),
        ).toBe(true);
      },
      { timeout: 3000 },
    );
    expect(useAdminUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "ADMIN", page: 1 }),
    );
  });

  it("opens the invite dialog through modal=invite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invites: [] }),
        }),
      ),
    );
    const { user } = renderPage("");
    await screen.findByText("Ada Tester");
    await user.click(screen.getByRole("button", { name: "Invite Admin" }));
    expect(
      await screen.findByRole("heading", { name: "Invite New Administrator" }),
    ).toBeInTheDocument();
    await vi.waitFor(
      () => {
        expect(seen.some((query) => query.includes("modal=invite"))).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it("cleans unknown filter and modal keys back to defaults", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invites: [] }),
        }),
      ),
    );
    renderPage("?role=bogus&modal=bogus");
    expect(await screen.findByText("Ada Tester")).toBeInTheDocument();
    await vi.waitFor(
      () => {
        expect(
          seen.some(
            (query) => !query.includes("role=") && !query.includes("modal="),
          ),
        ).toBe(true);
      },
      { timeout: 3000 },
    );
    expect(useAdminUsersMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "USER" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Invite New Administrator" }),
    ).not.toBeInTheDocument();
  });
});
