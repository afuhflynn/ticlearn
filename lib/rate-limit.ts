import ip from "@arcjet/ip";
import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { arcjetKey } from "./env";

const aj = arcjet({
  key: arcjetKey,
  characteristics: ["userId", "ip.src"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:MONITOR", "CATEGORY:VERCEL"],
    }),
  ],
});

const bucketConfigs: Record<
  string,
  { refillRate: number; interval: number; capacity: number }
> = {
  auth: { refillRate: 5, interval: 60, capacity: 20 },
  ai: { refillRate: 2, interval: 60, capacity: 10 },
  upload: { refillRate: 10, interval: 60, capacity: 20 },
  quiz: { refillRate: 10, interval: 60, capacity: 50 },
  notes: { refillRate: 20, interval: 60, capacity: 100 },
  search: { refillRate: 10, interval: 60, capacity: 30 },
  contact: { refillRate: 3, interval: 3600, capacity: 3 },
  payment: { refillRate: 10, interval: 60, capacity: 20 },
  admin: { refillRate: 30, interval: 60, capacity: 100 },
  default: { refillRate: 30, interval: 60, capacity: 100 },
};

function getBucketConfig(bucket: string) {
  return bucketConfigs[bucket] || bucketConfigs.default;
}

function getPathname(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

export async function limit(
  bucket: string,
  request: Request,
): Promise<NextResponse | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  let userId: string;
  if (session?.user.id) {
    userId = session.user.id;
  } else {
    userId = ip(request as any) || "127.0.0.1";
  }

  const config = getBucketConfig(bucket);

  const rule = tokenBucket({
    mode: "LIVE",
    characteristics: ["userId"],
    refillRate: config.refillRate,
    interval: config.interval,
    capacity: config.capacity,
  });

  let decision;
  try {
    decision = await aj
      .withRule(rule)
      .protect(request as any, { requested: 1, userId });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      logSecurityEvent("arcjet_fail_open", {
        route: getPathname(request),
        bucket,
        fingerprint: hashFingerprint(userId),
      });
      return null;
    }
    throw e;
  }

  if (decision.isDenied()) {
    logSecurityEvent("rate_limit_denied", {
      route: getPathname(request),
      bucket,
      fingerprint: hashFingerprint(userId),
    });
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  return null;
}

export async function limitOtpSend(
  request: Request,
  email: string,
): Promise<NextResponse | null> {
  const emailHash = hashEmail(email);

  const ajOtp = arcjet({
    key: arcjetKey,
    rules: [
      tokenBucket({
        mode: "LIVE",
        characteristics: ["ip.src"],
        refillRate: 3,
        interval: 600,
        capacity: 3,
      }),
      tokenBucket({
        mode: "LIVE",
        characteristics: ["userId"],
        refillRate: 3,
        interval: 600,
        capacity: 3,
      }),
    ],
  });

  let decision;
  try {
    decision = await ajOtp.protect(request as any, {
      requested: 1,
      userId: emailHash,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      logSecurityEvent("arcjet_fail_open", {
        route: getPathname(request),
        bucket: "otp",
        fingerprint: hashFingerprint(emailHash),
      });
      return null;
    }
    throw e;
  }

  if (decision.isDenied()) {
    logSecurityEvent("rate_limit_denied", {
      route: getPathname(request),
      bucket: "otp",
      fingerprint: hashFingerprint(emailHash),
    });
    return NextResponse.json(
      { error: "Too many OTP requests" },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  return null;
}

function hashFingerprint(value: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function hashEmail(email: string): string {
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function logSecurityEvent(event: string, data: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString(),
    }),
  );
}

export const EXEMPT_ROUTES = [
  "/api/inngest",
  "/api/auth",
  "/api/uploadthing",
  "/api/webhooks/fapshi",
];

export function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}
