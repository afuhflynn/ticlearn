import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { invalidateReadNamespace } from "@/lib/cache/reads";
import {
  DEFAULT_PLATFORM_SETTINGS,
  ensurePlatformSettings,
  getPlatformSettings,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  creditCostQuizGeneration: z.number().int().min(0).max(10_000).optional(),
  creditCostPracticeQuestion: z.number().int().min(0).max(1_000).optional(),
  creditCostRevisionGuideView: z.number().int().min(0).max(10_000).optional(),
  creditCostRevisionGuideGen: z.number().int().min(0).max(10_000).optional(),
  creditCostAiTutorMessage: z.number().int().min(0).max(1_000).optional(),
  creditCostMultiplierStarter: z.number().min(0.01).max(5).optional(),
  creditCostMultiplierStandard: z.number().min(0.01).max(5).optional(),
  creditCostMultiplierPremium: z.number().min(0.01).max(5).optional(),
  creditCostMultiplierPro: z.number().min(0.01).max(5).optional(),
  enforceCreditsForPractice: z.boolean().optional(),
  enforceCreditsForRevisionGuides: z.boolean().optional(),
  enforceCreditsForAiTutor: z.boolean().optional(),
  enforceCreditsAll: z.boolean().optional(),
  creditsPer1000Xaf: z.number().int().min(1).max(100_000).optional(),
  minCreditPurchaseXaf: z.number().int().min(100).max(1_000_000).optional(),
  maxCreditPurchaseXaf: z.number().int().min(100).max(10_000_000).optional(),
});

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session.user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensurePlatformSettings();
    const settings = await getPlatformSettings();

    return NextResponse.json({ settings, defaults: DEFAULT_PLATFORM_SETTINGS });
  } catch (error) {
    console.error("Platform settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = updateSchema.parse(await req.json());

    if (
      body.minCreditPurchaseXaf !== undefined &&
      body.maxCreditPurchaseXaf !== undefined &&
      body.minCreditPurchaseXaf > body.maxCreditPurchaseXaf
    ) {
      return NextResponse.json(
        { error: "minCreditPurchaseXaf cannot exceed maxCreditPurchaseXaf" },
        { status: 400 },
      );
    }

    const settings = await prisma.platformSettings.upsert({
      where: { key: "global" },
      create: {
        key: "global",
        ...DEFAULT_PLATFORM_SETTINGS,
        ...body,
      },
      update: body,
    });

    // Students must never see the old credit rule after this save. The cached
    // accessor is global, so the whole namespace goes.
    await invalidateReadNamespace("read:platform-settings");

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error("Platform settings PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update platform settings" },
      { status: 500 },
    );
  }
}
