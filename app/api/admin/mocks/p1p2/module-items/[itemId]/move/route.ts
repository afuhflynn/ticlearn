import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  targetModuleId: z.string().min(1),
  targetIndex: z.number().int().min(0),
});

type RouteCtx = { params: Promise<{ itemId: string }> };

/** Move a module row to another group (or re-order in the same group). */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { itemId } = await ctx.params;
    const { targetModuleId, targetIndex } = bodySchema.parse(await req.json());

    const item = await prisma.paper12MockModuleItem.findUnique({
      where: { id: itemId },
      select: { id: true, moduleId: true, blueprintId: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const targetMod = await prisma.paper12MockModule.findUnique({
      where: { id: targetModuleId },
      select: { id: true },
    });
    if (!targetMod) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }

    const sourceModuleId = item.moduleId;

    await prisma.$transaction(async (tx) => {
      if (item.moduleId !== targetModuleId) {
        const dup = await tx.paper12MockModuleItem.findFirst({
          where: {
            moduleId: targetModuleId,
            blueprintId: item.blueprintId,
            id: { not: itemId },
          },
        });
        if (dup) {
          throw new Error("DUPLICATE_BLUEPRINT");
        }
      }

      if (sourceModuleId === targetModuleId) {
        const rows = await tx.paper12MockModuleItem.findMany({
          where: { moduleId: targetModuleId },
          orderBy: { sortOrder: "asc" },
        });
        const ordered = rows.map((r) => r.id).filter((id) => id !== itemId);
        const idx = Math.min(targetIndex, ordered.length);
        ordered.splice(idx, 0, itemId);
        await Promise.all(
          ordered.map((id, i) =>
            tx.paper12MockModuleItem.update({
              where: { id },
              data: { sortOrder: i },
            }),
          ),
        );
        return;
      }

      await tx.paper12MockModuleItem.update({
        where: { id: itemId },
        data: { moduleId: targetModuleId },
      });

      const inTarget = await tx.paper12MockModuleItem.findMany({
        where: { moduleId: targetModuleId, id: { not: itemId } },
        orderBy: { sortOrder: "asc" },
      });
      const orderedTarget = inTarget.map((r) => r.id);
      const insertAt = Math.min(targetIndex, orderedTarget.length);
      orderedTarget.splice(insertAt, 0, itemId);
      await Promise.all(
        orderedTarget.map((id, i) =>
          tx.paper12MockModuleItem.update({
            where: { id },
            data: { sortOrder: i },
          }),
        ),
      );

      const inSource = await tx.paper12MockModuleItem.findMany({
        where: { moduleId: sourceModuleId },
        orderBy: { sortOrder: "asc" },
      });
      await Promise.all(
        inSource.map((r, i) =>
          tx.paper12MockModuleItem.update({
            where: { id: r.id },
            data: { sortOrder: i },
          }),
        ),
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "DUPLICATE_BLUEPRINT") {
      return NextResponse.json(
        { error: "That exam is already in the target group" },
        { status: 409 },
      );
    }
    console.error("P1P2 module item move error:", error);
    return NextResponse.json(
      { error: "Could not move item" },
      { status: 500 },
    );
  }
}
