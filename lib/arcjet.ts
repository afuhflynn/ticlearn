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
  "/pricing",
  "/admin",
];

const unprotectedAuthRoutes = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isUnprotectedAuthRoute = unprotectedAuthRoutes.some((r) =>
    pathname.startsWith(r),
  );

  if (!sessionCookie && isProtected) {
    const { searchParams } = new URL(request.url);
    const loginUrl = new URL("/sign-in", request.url);

    loginUrl.searchParams.set(
      "redirect",
      encodeURIComponent(
        `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`,
      ),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && isUnprotectedAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (sessionCookie && pathname === "/") {
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
