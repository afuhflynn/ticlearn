import { NextResponse } from "next/server";
import {
  logOnboarding,
  needAuth,
  requireUserId,
} from "@/lib/onboarding/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return needAuth();

  const row = await prisma.onboardingProgress.upsert({
    where: { userId },
    update: {},
    create: { userId, currentStep: 0, answers: {} },
    select: { id: true, currentStep: true, answers: true },
  });

  await logOnboarding(userId, "onboarding_started", { step: row.currentStep });
  return NextResponse.json({
    progressId: row.id,
    currentStep: row.currentStep,
    answers: row.answers,
  });
}
