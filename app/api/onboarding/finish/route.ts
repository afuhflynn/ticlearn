import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logOnboarding } from "@/lib/onboarding/server";
import { finishSchema } from "@/lib/onboarding/validation";
import { prisma } from "@/lib/prisma";

function ageOf(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = finishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your answers" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  let dob: Date | undefined;
  let age: number | undefined;
  if (body.dateOfBirth) {
    dob = new Date(body.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "That birth date does not parse. Pick it from the calendar." },
        { status: 422 },
      );
    }
    age = ageOf(dob);
    if (age < 15 || age > 50) {
      return NextResponse.json(
        { error: "Age must sit between 15 and 50." },
        { status: 422 },
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      levelOfStudy: body.levelOfStudy,
      targetGoal: body.targetGoal,
      ...(body.institution ? { institution: body.institution } : {}),
      ...(body.faculty ? { faculty: body.faculty } : {}),
      ...(body.program ? { program: body.program } : {}),
      ...(body.gender ? { gender: body.gender } : {}),
      ...(dob ? { dateOfBirth: dob } : {}),
      ...(age !== undefined ? { age } : {}),
      onboardingCompleted: true,
      onboardingSkipped: false,
    },
    select: {
      levelOfStudy: true,
      targetGoal: true,
      institution: true,
      faculty: true,
      program: true,
      onboardingCompleted: true,
    },
  });

  await prisma.onboardingProgress.updateMany({
    where: { userId },
    data: { completedAt: new Date(), currentStep: 3 },
  });

  await logOnboarding(userId, "onboarding_completed", {
    level: user.levelOfStudy,
    goal: user.targetGoal,
  });

  return NextResponse.json({ ok: true, user });
}
