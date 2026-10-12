import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_USD_TO_XAF_RATE, usdToXaf } from "@/lib/ai/pricing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limit } from "@/lib/rate-limit";

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  modelId: z.string().min(1).max(120).optional(),
  task: z.string().min(1).max(60).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const gated = await limit("admin", req);
  if (gated) return gated;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { page, pageSize, modelId, task } = parsed.data;
  const from = parsed.data.from
    ? new Date(`${parsed.data.from}T00:00:00+01:00`)
    : new Date(Date.now() - 30 * 24 * 3600_000);
  const to = parsed.data.to
    ? new Date(
        new Date(`${parsed.data.to}T00:00:00+01:00`).getTime() + 24 * 3600_000,
      )
    : new Date();

  const where = {
    createdAt: { gte: from, lt: to },
    ...(modelId ? { modelId } : {}),
    ...(task ? { task } : {}),
  };

  const [rows, total, sums] = await Promise.all([
    prisma.aiUsageEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        task: true,
        modelId: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
        costXaf: true,
        latencyMs: true,
        errorCode: true,
        createdAt: true,
      },
    }),
    prisma.aiUsageEvent.count({ where }),
    prisma.aiUsageEvent.aggregate({
      where,
      _sum: {
        costUsd: true,
        costXaf: true,
        promptTokens: true,
        completionTokens: true,
      },
      _count: { id: true },
    }),
  ]);

  const [byModel, byTask] = await Promise.all([
    prisma.aiUsageEvent.groupBy({
      by: ["modelId"],
      where,
      _sum: { costXaf: true },
      _count: { id: true },
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["task"],
      where,
      _sum: { costXaf: true },
      _count: { id: true },
    }),
  ]);

  const settings = await prisma.platformSettings.findUnique({
    where: { key: "global" },
  });
  const rate = settings?.usdToXafRate ?? DEFAULT_USD_TO_XAF_RATE;

  return NextResponse.json({
    rows,
    page,
    pageSize,
    total,
    totals: {
      calls: sums._count.id,
      // Converted from the precise USD sum, not the sum of whole franc rows.
      costXaf: usdToXaf(sums._sum.costUsd ?? 0, rate),
      costUsd: sums._sum.costUsd ?? 0,
      promptTokens: sums._sum.promptTokens ?? 0,
      completionTokens: sums._sum.completionTokens ?? 0,
    },
    byModel,
    byTask,
  });
}
