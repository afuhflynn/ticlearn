import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logOnboarding } from "@/lib/onboarding/server";
import {
  goalStepSchema,
  levelStepSchema,
  STEP_KEYS,
  schoolStepSchema,
} from "@/lib/onboarding/validation";
import { prisma } from "@/lib/prisma";

const saveSchema = z.object({
  step: z.number().int().min(0).max(3),
  stepKey: z.enum(STEP_KEYS),
  answers: z.record(z.string(), z.unknown()),
  skipped: z.boolean().optional().default(false),
});

function validateStep(stepKey: string, answers: Record<string, unknown>) {
  if (stepKey === "level") return levelStepSchema.safeParse(answers);
  if (stepKey === "goal") return goalStepSchema.safeParse(answers);
  if (stepKey === "school") return schoolStepSchema.safeParse(answers);
  return { success: true as const, data: answers };
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.onboardingProgress.findUnique({
    where: { userId: session.user.id },
    select: { currentStep: true, answers: true, updatedAt: true },
  });
  if (!row) return NextResponse.json({ currentStep: 0, answers: {} });
  return NextResponse.json(row);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad save" },
      { status: 400 },
    );
  }
  const { step, stepKey, answers, skipped } = parsed.data;

  if (skipped) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingSkipped: true, onboardingCompleted: false },
    });
    await prisma.onboardingProgress.upsert({
      where: { userId },
      update: { currentStep: step, answers: answers as never },
      create: { userId, currentStep: step, answers: answers as never },
    });
    await logOnboarding(userId, "onboarding_skipped", { step });
    return NextResponse.json({ currentStep: step, saved: true, skipped: true });
  }

  const check = validateStep(stepKey, answers as Record<string, unknown>);
  if (!check.success) {
    const issue =
      "error" in check
        ? check.error.issues[0]?.message
        : "That value looks off. Pick one of the choices shown.";
    return NextResponse.json(
      {
        error: issue ?? "That value looks off. Pick one of the choices shown.",
      },
      { status: 422 },
    );
  }

  const existing = await prisma.onboardingProgress.findUnique({
    where: { userId },
    select: { answers: true },
  });
  const merged = {
    ...((existing?.answers as Record<string, unknown> | null) ?? {}),
    ...(check.data as Record<string, unknown>),
  };

  const row = await prisma.onboardingProgress.upsert({
    where: { userId },
    update: { currentStep: step, answers: merged as never },
    create: { userId, currentStep: step, answers: merged as never },
    select: { currentStep: true },
  });

  await logOnboarding(userId, "onboarding_step_saved", { step, stepKey });
  return NextResponse.json({ currentStep: row.currentStep, saved: true });
}
