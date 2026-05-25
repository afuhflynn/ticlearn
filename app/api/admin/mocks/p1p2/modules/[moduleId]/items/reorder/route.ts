import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  orderedItemIds: z.array(z.string().min(1)).min(1),
});

type RouteCtx = { params: Promise<{ moduleId: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { moduleId } = await ctx.params;
    const body = bodySchema.parse(await req.json());

    const existing = await prisma.paper12MockModuleItem.findMany({
      where: { moduleId },
      select: { id: true },
    });
    const valid = new Set(existing.map((r) => r.id));
    if (existing.length !== body.orderedItemIds.length) {
      return NextResponse.json(
        { error: "Item count does not match this group" },
        { status: 400 },
      );
    }
    for (const id of body.orderedItemIds) {
      if (!valid.has(id)) {
        return NextResponse.json(
          { error: "Unknown item in this group" },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(
      body.orderedItemIds.map((id, sortOrder) =>
        prisma.paper12MockModuleItem.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    console.error("P1P2 module items reorder error:", error);
    return NextResponse.json(
      { error: "Could not reorder" },
      { status: 500 },
    );
  }
}
