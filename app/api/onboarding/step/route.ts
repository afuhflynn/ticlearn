import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 },
      );
    }

    const { step, data } = body as { step?: unknown; data?: unknown };

    if (typeof step !== "number" || step < 1 || step > 6) {
      return NextResponse.json(
        { error: "step must be a number between 1 and 6" },
        { status: 400 },
      );
    }
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "data must be an object" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, activeProfileId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    let activeProfileId = user.activeProfileId;

    if (!activeProfileId) {
      if (step === 1) {
        const unknownProgram = await prisma.program.findUnique({
          where: { code: "UNKNOWN" },
        });
        if (!unknownProgram) {
          return NextResponse.json(
            { error: "UNKNOWN program not found" },
            { status: 500 },
          );
        }
        const profile = await prisma.examProfile.create({
          data: {
            userId: user.id,
            programs: {
              create: { programId: unknownProgram.id },
            },
          },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { activeProfileId: profile.id },
        });
        activeProfileId = profile.id;
      } else {
        return NextResponse.json(
          { error: "No active profile. Start onboarding from step 1." },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = { onboardingStep: step };

    switch (step) {
      case 1:
        break;
      case 2: {
        const programIds = (data as Record<string, unknown>)
          .programIds as string[];
        if (!Array.isArray(programIds) || programIds.length === 0) {
          return NextResponse.json(
            { error: "programIds must be a non-empty array" },
            { status: 400 },
          );
        }
        for (const pid of programIds) {
          await prisma.examProfileProgram.upsert({
            where: {
              examProfileId_programId: {
                examProfileId: activeProfileId,
                programId: pid,
              },
            },
            update: {},
            create: { examProfileId: activeProfileId, programId: pid },
          });
        }
        break;
      }
      case 3:
        if ((data as Record<string, unknown>).examYear) {
          updateData.examYear = (data as Record<string, unknown>).examYear;
        }
        if ((data as Record<string, unknown>).examDate) {
          const d = new Date(
            (data as Record<string, unknown>).examDate as string,
          );
          if (d.toString() === "Invalid Date") {
            return NextResponse.json(
              { error: "Invalid examDate" },
              { status: 400 },
            );
          }
          updateData.examDate = d;
        }
        break;
      case 4:
        break;
      case 5: {
        const d = data as Record<string, unknown>;
        if (typeof d.isRetaking === "boolean")
          updateData.isRetaking = d.isRetaking;
        if (typeof d.studyHoursPerWeek === "number")
          updateData.studyHoursPerWeek = d.studyHoursPerWeek;
        break;
      }
      case 6: {
        const d = data as Record<string, unknown>;
        updateData.onboardingCompleted = true;
        updateData.onboardingStep = 6;
        if (d.skipped === true) updateData.onboardingSkipped = true;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const profile = await prisma.examProfile.update({
      where: { id: activeProfileId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Onboarding step error:", error);
    return NextResponse.json({ error: "Failed to save step" }, { status: 500 });
  }
}
