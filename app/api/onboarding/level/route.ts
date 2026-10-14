import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { levelOfStudySchema } from "@/constants/levels";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const setLevelSchema = z.object({
  level: levelOfStudySchema,
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { level } = setLevelSchema.parse(await req.json());

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        levelOfStudy: level,
        onboardingCompleted: true,
        onboardingSkipped: false,
      },
      select: { levelOfStudy: true, onboardingCompleted: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Onboarding level POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid level" },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save your level" },
      { status: 500 },
    );
  }
}
