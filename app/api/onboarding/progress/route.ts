import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        activeProfileId: true,
        examProfiles: {
          select: {
            id: true,
            onboardingStep: true,
            onboardingCompleted: true,
            onboardingSkipped: true,
            phoneCountryCode: true,
            phoneNumber: true,
          },
        },
      },
    });

    const activeProfile =
      user?.examProfiles.find((p) => p.id === user.activeProfileId) ?? null;

    return NextResponse.json({ activeProfile });
  } catch (error) {
    console.error("Onboarding progress error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}
