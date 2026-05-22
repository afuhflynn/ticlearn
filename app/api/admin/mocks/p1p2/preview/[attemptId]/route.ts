import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseStoredSessionPayload,
} from "@/lib/mock-session-payload";
import type { MockSessionPayload } from "@/lib/mock-generator";

/**
 * Full question preview for admin (includes stems, MCQ options, and marking keys).
 * Only ADMIN_PREVIEW attempts owned by the admin user.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attemptId } = await ctx.params;

    const profiles = await prisma.examProfile.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileIds = profiles.map((p) => p.id);

    const attempt = await prisma.mockAttempt.findFirst({
      where: {
        id: attemptId,
        creationContext: "ADMIN_PREVIEW",
        examProfileId: { in: profileIds },
      },
      select: {
        id: true,
        totalMarks: true,
        sessionPayload: true,
        completedAt: true,
        startedAt: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Preview not found" }, { status: 404 });
    }

    const payload = parseStoredSessionPayload(attempt.sessionPayload);
    if (!payload) {
      return NextResponse.json(
        { error: "Missing session data for this preview" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      preview: {
        attemptId: attempt.id,
        displayName: payload.displayName,
        durationMin: payload.durationMin,
        totalMarks: payload.totalMarks,
        completedAt: attempt.completedAt,
        startedAt: attempt.startedAt,
        sections: payload.sections as MockSessionPayload["sections"],
      },
    });
  } catch (error) {
    console.error("Admin mock preview GET error:", error);
    return NextResponse.json(
      { error: "Failed to load preview" },
      { status: 500 },
    );
  }
}
