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

    const body = await req.json();
    const { step, data } = body;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { activeProfileId: true },
    });

    if (!user.activeProfileId) {
      return NextResponse.json({ error: "No active profile" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { onboardingStep: step };

    switch (step) {
      case 1:
        break;
      case 2:
        updateData.programId = data.programId;
        break;
      case 2:
        updateData.programId = data.programId;
        break;
      case 3:
        if (data.examYear) updateData.examYear = data.examYear;
        if (data.examDate) updateData.examDate = new Date(data.examDate);
        break;
      case 4:
        break;
      case 5:
        if (typeof data.isRetaking === "boolean") updateData.isRetaking = data.isRetaking;
        if (data.studyHoursPerWeek) updateData.studyHoursPerWeek = data.studyHoursPerWeek;
        break;
      case 6:
        updateData.onboardingCompleted = true;
        updateData.onboardingStep = 6;
        break;
      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const profile = await prisma.examProfile.update({
      where: { id: user.activeProfileId },
      data: updateData,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("Onboarding step error:", error);
    return NextResponse.json({ error: "Failed to save step" }, { status: 500 });
  }
}
