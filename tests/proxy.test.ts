/**
 * The onboarding gate and the admin role gate, both of which live in
 * `proxy.ts` and nowhere else (spec 0012, AC-3, AC-4, AC-5, AC-6, AC-13).
 *
 * The gate answers before the first byte, so the two things that matter are
 * that it redirects the right people and that it never redirects when it does
 * not know the answer. A gate that cannot answer must never turn into a
 * redirect loop.
 */
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const getSessionCookieMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const protectMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      kind: "json",
      data,
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
    }),
    redirect: (url: string | URL) => ({
      kind: "redirect",
      status: 307,
      headers: new Headers({ Location: url.toString() }),
    }),
    next: () => ({ kind: "next", status: 200, headers: new Headers() }),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: getSessionCookieMock,
}));

vi.mock("@arcjet/next", () => ({
  default: vi.fn(() => ({ protect: protectMock })),
  createMiddleware: vi.fn((_aj: unknown, handler: unknown) => handler),
  detectBot: vi.fn(() => ({})),
  shield: vi.fn(() => ({})),
  tokenBucket: vi.fn(() => ({})),
}));

vi.mock("@/lib/env", () => ({ arcjetKey: "test-arcjet-key" }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

import { proxy } from "@/proxy";

const ORIGIN = "http://localhost:3000";

type ProxyResponse = {
  kind: string;
  status: number;
  headers: Headers;
  data?: unknown;
};

function makeRequest(pathname: string): NextRequest {
  return {
    nextUrl: { pathname },
    url: `${ORIGIN}${pathname}`,
    headers: new Headers(),
  } as unknown as NextRequest;
}

function signIn(role = "USER") {
  getSessionCookieMock.mockReturnValue("session-cookie");
  getSessionMock.mockResolvedValue({
    user: { id: "user-1", name: "Ada", role },
  });
}

function signOut() {
  getSessionCookieMock.mockReturnValue(undefined);
  getSessionMock.mockResolvedValue(null);
}

function hasLevel(levelOfStudy: string | null = "Year 2") {
  findUniqueMock.mockResolvedValue({
    levelOfStudy,
    onboardingSkipped: false,
  });
}

function skippedOnboarding() {
  findUniqueMock.mockResolvedValue({
    levelOfStudy: null,
    onboardingSkipped: true,
  });
}

async function run(pathname: string): Promise<ProxyResponse> {
  const response = await proxy(makeRequest(pathname));
  return response as unknown as ProxyResponse;
}

function locationOf(response: ProxyResponse): string | null {
  return response.headers.get("Location");
}

function pathOf(response: ProxyResponse): string | null {
  const location = locationOf(response);
  return location ? new URL(location).pathname : null;
}

beforeEach(() => {
  protectMock.mockResolvedValue({ isDenied: () => false });
  getSessionCookieMock.mockReset();
  getSessionMock.mockReset();
  findUniqueMock.mockReset();
  hasLevel();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the onboarding gate in proxy.ts (spec 0012)", () => {
  it("AC-3 sends a signed in student with no level to /onboarding from /dashboard", async () => {
    signIn();
    hasLevel(null);

    const response = await run("/dashboard");

    expect(pathOf(response)).toBe("/onboarding");
  });

  it("AC-4 sends a student with no level from / to /onboarding and not to /chat", async () => {
    signIn();
    hasLevel(null);

    const response = await run("/");

    expect(pathOf(response)).toBe("/onboarding");
  });

  it("AC-4 sends a student with no level from /chat to /onboarding", async () => {
    signIn();
    hasLevel(null);

    const response = await run("/chat");

    expect(pathOf(response)).toBe("/onboarding");
  });

  it("AC-17 sends a student with a level from / to /dashboard", async () => {
    signIn();
    hasLevel("Year 2");

    const response = await run("/");

    expect(pathOf(response)).toBe("/dashboard");
  });

  it("AC-4 leaves /onboarding alone for a student with no level", async () => {
    signIn();
    hasLevel(null);

    const response = await run("/onboarding");

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("AC-17 sends an onboarded student away from /onboarding to /dashboard", async () => {
    signIn();
    hasLevel("Year 2");

    const response = await run("/onboarding");

    expect(pathOf(response)).toBe("/dashboard");
  });

  it("AC-17 sends a student who skipped onboarding away from /onboarding to /dashboard", async () => {
    signIn();
    skippedOnboarding();

    const response = await run("/onboarding");

    expect(pathOf(response)).toBe("/dashboard");
  });

  it("AC-4 never redirects the exempt paths", async () => {
    signIn();
    hasLevel(null);

    for (const pathname of [
      "/pricing",
      "/faq",
      "/contact",
      "/about",
      "/privacy",
      "/terms",
      "/sign-in",
      "/sign-up",
      "/verify-email",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
    ]) {
      const response = await run(pathname);
      expect(pathOf(response), `${pathname} must not be redirected`).not.toBe(
        "/onboarding",
      );
    }
  });

  it("AC-3 never queries the database for an exempt path", async () => {
    signIn();
    hasLevel(null);

    await proxy(makeRequest("/pricing"));

    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("AC-3 never queries the database for an /api path", async () => {
    signIn();
    hasLevel(null);

    const response = await run("/api/profile");

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(pathOf(response)).toBeNull();
  });

  it("AC-3 reads the level of the signed in user on every request", async () => {
    signIn();

    hasLevel(null);
    const first = await run("/dashboard");
    expect(pathOf(first)).toBe("/onboarding");

    hasLevel("Year 2");
    const second = await run("/dashboard");
    expect(pathOf(second)).toBeNull();

    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(findUniqueMock).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      select: { levelOfStudy: true, onboardingSkipped: true },
    });
  });

  it("AC-5 fails open and logs when the database read fails", async () => {
    signIn();
    findUniqueMock.mockRejectedValue(new Error("connection refused"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await run("/dashboard");

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
    expect(warn).toHaveBeenCalled();
  });

  it("AC-5 fails open when the database read does not answer inside 500 ms", async () => {
    signIn();
    findUniqueMock.mockReturnValue(new Promise(() => {}));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers();

    const pending = run("/dashboard");
    await vi.advanceTimersByTimeAsync(500);
    const response = await pending;

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe("the admin role gate in proxy.ts (spec 0012)", () => {
  it("AC-6 redirects a student away from /admin to /dashboard with an absolute URL", async () => {
    signIn("USER");
    hasLevel("Year 2");

    const response = await run("/admin/users");

    expect(pathOf(response)).toBe("/dashboard");
    expect(locationOf(response)).toBe(`${ORIGIN}/dashboard`);
  });

  it("AC-6 lets a student open /admin/accept-invite", async () => {
    signIn("USER");
    hasLevel("Year 2");

    const response = await run("/admin/accept-invite");

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("AC-6 lets an admin open /admin/users", async () => {
    signIn("ADMIN");
    hasLevel("Year 2");

    const response = await run("/admin/users");

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
  });
});

describe("the signed out path through proxy.ts (spec 0012)", () => {
  it("AC-13 sends a signed out visitor from /dashboard to /sign-in with a callbackUrl", async () => {
    signOut();

    const response = await run("/dashboard");

    const location = locationOf(response);
    expect(location).not.toBeNull();
    const url = new URL(location as string);
    expect(url.pathname).toBe("/sign-in");
    // The proxy stores the callback encoded, and the sign in page decodes it
    // once before it navigates, so this is the path the visitor asked for.
    expect(decodeURIComponent(url.searchParams.get("callbackUrl") ?? "")).toBe(
      "/dashboard",
    );
  });

  it("AC-3 leaves the landing page alone for a signed out visitor", async () => {
    signOut();

    const response = await run("/");

    expect(pathOf(response)).toBeNull();
    expect(response.status).toBe(200);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe("the protected prefixes in proxy.ts (spec 0014, AC-17)", () => {
  it("sends a signed out visitor from a note page to sign in", async () => {
    signOut();

    const response = await run("/notes/note-1");

    const url = new URL(locationOf(response) as string);
    expect(url.pathname).toBe("/sign-in");
    expect(decodeURIComponent(url.searchParams.get("callbackUrl") ?? "")).toBe(
      "/notes/note-1",
    );
  });

  it("sends a signed out visitor from an attempt review to sign in", async () => {
    signOut();

    const response = await run("/attempts/attempt-9");

    const url = new URL(locationOf(response) as string);
    expect(url.pathname).toBe("/sign-in");
    expect(decodeURIComponent(url.searchParams.get("callbackUrl") ?? "")).toBe(
      "/attempts/attempt-9",
    );
  });

  it("lets a signed in student straight through to their note and attempt", async () => {
    signIn();
    hasLevel("Year 2");

    for (const pathname of ["/notes/note-1", "/attempts/attempt-9"]) {
      const response = await run(pathname);
      expect(pathOf(response), `${pathname} must not be redirected`).toBeNull();
    }
  });
});

describe("the api rate limit in proxy.ts (spec 0012)", () => {
  it("denies an api request that is over the limit", async () => {
    protectMock.mockResolvedValue({ isDenied: () => true });

    const response = await run("/api/profile");

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
