import arcjet, {
  createMiddleware,
  detectBot,
  shield,
  tokenBucket,
} from "@arcjet/next";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./lib/auth";
import { arcjetKey } from "./lib/env";
import { prisma } from "./lib/prisma";

const aj = arcjet({
  key: arcjetKey,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:VERCEL"],
    }),
  ],
});

const apiRateLimit = arcjet({
  key: arcjetKey,
  rules: [
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 60,
      interval: 60,
      capacity: 100,
    }),
  ],
});

const publicPaths = [
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/pricing",
  "/r",
  "/api/auth",
  "/api/webhooks",
  "/api/inngest",
  "/api/uploadthing",
  "/api/ambassadors/click",
];

const authPaths = ["/sign-in", "/sign-up", "/verify-email"];

const protectedRoutes = [
  "/dashboard",
  "/upload",
  "/quizzes",
  "/notes",
  "/attempts",
  "/chat",
  "/settings",
  "/admin",
  "/subscription",
  "/ambassadors",
  "/affiliates",
  "/onboarding",
];

/**
 * The onboarding gate, the only gate in the app, lives here and nowhere else.
 *
 * It runs before anything is sent, because a redirect cannot be streamed: the
 * response cannot start until the gate has answered. So the wait is bounded,
 * and it fails open. A database blip must not turn into a redirect loop
 * between onboarding and the dashboard for everyone online. What failing open
 * actually costs is one signed in student with no level reaching one page that
 * has no content for them, because this gate can only ever redirect. It never
 * grants access to anybody.
 */
const ONBOARDING_GATE_TIMEOUT_MS = 500;

/**
 * Paths the gate must never redirect. `/onboarding` is here because the
 * forward gate would otherwise redirect it to itself.
 */
const ONBOARDING_EXEMPT_PATHS = [
  ...publicPaths,
  ...authPaths,
  "/onboarding",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
];

function isOnboardingExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    ONBOARDING_EXEMPT_PATHS.some((path) => pathname.startsWith(path))
  );
}

/**
 * Bounded wait. The race bounds when we stop waiting; the `statement_timeout`
 * in `lib/prisma.ts` bounds the query, because a losing race does not cancel
 * it and an unbounded query still holds a pool connection.
 */
function readWithin<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const decision = await apiRateLimit.protect(request, { requested: 1 });
    if (decision.isDenied()) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  const sessionCookie = getSessionCookie(request);
  const session = await auth.api.getSession({ headers: await headers() });

  // Onboarding gate. Reads one column for the signed in user, only when the
  // answer can change what this request does, so public pages and API calls
  // never pay for it.
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const signedIn = Boolean(sessionCookie && session);

  if (signedIn && (isOnboardingPath || !isOnboardingExempt(pathname))) {
    const userId = session?.user.id ?? "";

    const level = await readWithin(
      prisma.user.findUnique({
        where: { id: userId },
        select: { levelOfStudy: true, onboardingSkipped: true },
      }),
      ONBOARDING_GATE_TIMEOUT_MS,
    ).catch((error) => {
      console.warn("onboarding gate read failed, allowing request", {
        error,
        pathname,
      });
      return null;
    });

    // null means "we do not know", which must never become a redirect.
    if (level) {
      const onboarded = Boolean(level.levelOfStudy || level.onboardingSkipped);

      if (!onboarded && !isOnboardingExempt(pathname)) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }

      if (onboarded && isOnboardingPath) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  if (pathname === "/") {
    if (sessionCookie && session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authPaths.some((r) => pathname.startsWith(r));

  if ((!sessionCookie || !session) && isProtected) {
    const { searchParams } = new URL(request.url);
    const loginUrl = new URL("/sign-in", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // `/admin/accept-invite` is exempt: the person using it is signed in but is
  // not an admin yet. The absolute URL matters, `NextResponse.redirect` throws
  // on a relative one.
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/accept-invite") &&
    session?.user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default createMiddleware(aj, proxy);
