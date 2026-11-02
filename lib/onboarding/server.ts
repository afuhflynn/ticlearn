import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trackEvent } from "@/lib/kpi";

export async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session.user.id as string;
}

export function needAuth() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function logOnboarding(
  userId: string,
  event: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await trackEvent(userId, event, metadata);
  } catch (error) {
    console.warn("[onboarding] funnel log failed", { event, error });
  }
}
