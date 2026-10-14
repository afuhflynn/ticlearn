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
  "/cookies",
  "/faq",
  "/privacy",
  "/terms",
  "/pricing",
  "/api/auth",
  "/api/webhooks",
  "/api/inngest",
  "/api/contact",
  "/api/uploadthing",
];

const authPaths = ["/sign-in", "/sign-up", "/verify-email"];

const protectedRoutes = [
  "/dashboard",
  "/upload",
  "/quizzes",
  "/progress",
  "/chat",
  "/community",
  "/leaderboard",
  "/feedback",
  "/affiliate",
  "/settings",
  "/admin",
  "/subscription",
  "/onboarding",
];

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

  if (pathname === "/") {
    if (sessionCookie && session) {
      return NextResponse.redirect(new URL("/chat", request.url));
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
      encodeURIComponent(
        `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`,
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && session && isAuthRoute) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  if (pathname.startsWith("/admin") && session?.user.role !== "ADMIN") {
    return NextResponse.redirect("/dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default createMiddleware(aj, proxy);
