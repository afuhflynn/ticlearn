// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { cookies, headers } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The layouts of the signed in surfaces (spec 0012, AC-2 and AC-7).
 *
 * A layout is a shell. It paints its chrome from static markup and lets the
 * page segment stream in behind it, so it must not read the session, the
 * request, or the database, and it must not redirect. Every gate that has to
 * answer before the first byte lives in `proxy.ts`.
 *
 * The chrome is stubbed here on purpose. The contract under test is the
 * layout's own behaviour, not the sidebar's.
 */
const getSessionMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarTrigger: () => <button type="button">toggle</button>,
}));

vi.mock("@/components/layout/AppSidebar", () => ({
  AppSidebar: () => <div>app sidebar</div>,
}));

vi.mock("@/components/layout/DashboardHeader", () => ({
  DashboardHeader: () => <div>dashboard header</div>,
}));

vi.mock("@/components/layout/AdminSidebar", () => ({
  AdminSidebar: () => <div>admin sidebar</div>,
}));

vi.mock("@/components/chat/chat-sidebar", () => ({
  ChatSidebar: () => <div>chat sidebar</div>,
}));

vi.mock("@/components/chat/chat-header", () => ({
  ChatHeader: () => <div>chat header</div>,
}));

type LayoutModule = {
  default: (props: { children: React.ReactNode }) => React.ReactElement;
  metadata?: { robots?: { index?: boolean; follow?: boolean } };
};

const LAYOUTS: { name: string; load: () => Promise<LayoutModule> }[] = [
  {
    name: "app/(dashboard)/layout.tsx",
    load: () =>
      import("@/app/(dashboard)/layout") as unknown as Promise<LayoutModule>,
  },
  {
    name: "app/(admin)/layout.tsx",
    load: () =>
      import("@/app/(admin)/layout") as unknown as Promise<LayoutModule>,
  },
  {
    name: "app/(auth)/layout.tsx",
    load: () =>
      import("@/app/(auth)/layout") as unknown as Promise<LayoutModule>,
  },
  {
    name: "app/chat/layout.tsx",
    load: () => import("@/app/chat/layout") as unknown as Promise<LayoutModule>,
  },
  {
    name: "app/(onboarding)/onboarding/layout.tsx",
    load: () =>
      import(
        "@/app/(onboarding)/onboarding/layout"
      ) as unknown as Promise<LayoutModule>,
  },
];

beforeEach(() => {
  getSessionMock.mockReset();
  findUniqueMock.mockReset();
  redirectMock.mockReset();
});

describe.each(LAYOUTS)("the layout shell $name (spec 0012 AC-2)", (layout) => {
  it("renders its children without reading the session", async () => {
    const module = await layout.load();

    render(module.default({ children: <p>the page</p> }));

    expect(screen.getByText("the page")).toBeInTheDocument();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("renders its children without reading the database", async () => {
    const module = await layout.load();

    render(module.default({ children: <p>the page</p> }));

    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("renders its children without reading the request", async () => {
    const module = await layout.load();

    render(module.default({ children: <p>the page</p> }));

    expect(headers).not.toHaveBeenCalled();
    expect(cookies).not.toHaveBeenCalled();
  });

  it("renders its children without redirecting", async () => {
    const module = await layout.load();

    render(module.default({ children: <p>the page</p> }));

    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe.each(LAYOUTS)("the layout shell $name (spec 0012 AC-7)", (layout) => {
  it("takes its crawl rule from the helper", async () => {
    const module = await layout.load();

    expect(module.metadata?.robots).toEqual({ index: false, follow: false });
  });
});
