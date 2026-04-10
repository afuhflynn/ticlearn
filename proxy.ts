import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY as string,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:VERCEL"],
    }),
  ],
});

const publicPaths = [
  "/",
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
  "/gce-exams",
  "/feedback",
  "/affiliate",
  "/settings",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authPaths.some((r) => pathname.startsWith(r));

  // Redirect unauthenTiCted users accessing protected routes to sign-in
  if (!sessionCookie && isProtected) {
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

  // Redirect authenTiCted users from auth pages to dashboard
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect authenTiCted users on root to dashboard
  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default createMiddleware(aj, proxy);
