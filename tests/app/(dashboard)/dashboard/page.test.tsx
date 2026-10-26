// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * The dashboard page (spec 0012, AC-13 and AC-14).
 *
 * The page may read the session, because the prefetch needs the user id, but
 * the redirect does not live here any more. `proxy.ts` owns it.
 */
const getSessionMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const dashboardData = vi.hoisted(() => ({
  getDashboardContinue: vi.fn(async () => ({
    recentNotes: [],
    lastAttempt: null,
  })),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/dashboard-data", () => dashboardData);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/app/(dashboard)/dashboard/dashboard-client", () => ({
  DashboardClient: ({ userName }: { userName: string }) => (
    <div>greeting for {userName}</div>
  ),
}));

import DashboardPage from "@/app/(dashboard)/dashboard/page";

async function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = await DashboardPage();
  return render(
    <QueryClientProvider client={client}>{tree}</QueryClientProvider>,
  );
}

describe("the dashboard page (spec 0012 AC-13)", () => {
  it("renders nothing and never redirects when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const { container } = await renderPage();

    expect(container).toBeEmptyDOMElement();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("prefetches the dashboard data for the signed in user", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-42", name: "Ada" },
    });

    await renderPage();

    expect(dashboardData.getDashboardContinue).toHaveBeenCalledWith("user-42");
  });

  it("hands the signed in name to the client as the server already knows it", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-42", name: "Ada" },
    });

    const { container } = await renderPage();

    expect(container).toHaveTextContent("Ada");
  });

  it("falls back to a neutral name when the session carries none", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-42", name: null },
    });

    const { container } = await renderPage();

    expect(container).toHaveTextContent("Student");
  });
});
