import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { planCatalog } from "@/constants/plans";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearResolvedPlansCache,
  getResolvedPlans,
} from "@/lib/resolved-plans";

const putSchema = z.object({
  planKey: z.string().min(1),
  priceXaf: z.number().int().min(100).max(20000).optional(),
  limits: z
    .object({
      pdfUploads: z.number().int().min(0).max(1000).optional(),
      quizGenerations: z.number().int().min(0).max(1000).optional(),
      aiTutorMessages: z.number().int().min(0).max(1000).optional(),
      maxConversationMessages: z.number().int().min(0).max(1000).optional(),
    })
    .optional(),
});

function isAdmin(userRole: unknown) {
  return userRole === "ADMIN";
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin((session.user as { role?: string }).role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [tiers, overrides, audits] = await Promise.all([
    getResolvedPlans(),
    prisma.planOverride.findMany({ orderBy: { planKey: "asc" } }),
    prisma.planAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    file: Object.values(planCatalog),
    resolved: tiers,
    overrides,
    audits,
  });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin((session.user as { role?: string }).role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = putSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid counts" }, { status: 400 });
  }
  const { planKey, priceXaf, limits } = parsed.data;
  if (!(planKey in planCatalog)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  if (priceXaf != null && priceXaf % 50 !== 0) {
    return NextResponse.json(
      { error: "Price must be in round 50 steps" },
      { status: 400 },
    );
  }

  const before = await prisma.planOverride.findUnique({
    where: { planKey },
  });

  const afterData = {
    priceXaf: priceXaf ?? before?.priceXaf ?? null,
    limits: (limits ?? (before?.limits as never) ?? null) as never,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.planOverride.upsert({
      where: { planKey },
      create: {
        planKey,
        priceXaf: afterData.priceXaf,
        limits: afterData.limits,
        updatedBy: session.user.id,
      },
      update: {
        priceXaf: afterData.priceXaf,
        limits: afterData.limits,
        updatedBy: session.user.id,
      },
    });
    await tx.planAudit.create({
      data: {
        planKey,
        actorId: session.user.id,
        before: (before ?? null) as never,
        after: { priceXaf: row.priceXaf, limits: row.limits } as never,
      },
    });
    return row;
  });

  clearResolvedPlansCache();
  const tiers = await getResolvedPlans();

  return NextResponse.json({
    override: updated,
    resolved: tiers.find((t) => t.key === planKey) ?? null,
  });
}
