import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { levelOfStudySchema } from "@/constants/levels";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const setLevelSchema = z.object({
  level: levelOfStudySchema.optional(),
  institution: z.string().optional(),
  faculty: z.string().optional(),
  program: z.string().optional(),
  targetGoal: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  age: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = setLevelSchema.parse(await req.json());

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.level && { levelOfStudy: body.level }),
        ...(body.institution && { institution: body.institution }),
        ...(body.faculty && { faculty: body.faculty }),
        ...(body.program && { program: body.program }),
        ...(body.targetGoal && { targetGoal: body.targetGoal }),
        ...(body.gender && { gender: body.gender }),
        ...(body.age && { age: body.age }),
        onboardingCompleted: true,
        onboardingSkipped: false,
      },
      select: {
        levelOfStudy: true,
        institution: true,
        faculty: true,
        program: true,
        targetGoal: true,
        gender: true,
        age: true,
        onboardingCompleted: true,
      },
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
