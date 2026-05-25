import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  blueprintId: z.string().min(1),
});

type RouteCtx = { params: Promise<{ moduleId: string }> };

/** Append an existing Paper 1/2 blueprint to a mock group. */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { moduleId } = await ctx.params;
    const body = postSchema.parse(await req.json());

    const mod = await prisma.paper12MockModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!mod) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const bp = await prisma.examBlueprint.findUnique({
      where: { id: body.blueprintId },
      include: { component: { select: { type: true } } },
    });
    if (!bp || bp.component.type !== "PAPER") {
      return NextResponse.json(
        { error: "Blueprint not found or not a paper exam" },
        { status: 400 },
      );
    }

    const maxOrd = await prisma.paper12MockModuleItem.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrd._max.sortOrder ?? -1) + 1;

    const item = await prisma.paper12MockModuleItem.create({
      data: {
        moduleId,
        blueprintId: body.blueprintId,
        sortOrder,
      },
      include: {
        blueprint: {
          include: { sections: { orderBy: { order: "asc" } } },
        },
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return NextResponse.json(
        { error: "That exam is already in this group" },
        { status: 409 },
      );
    }
    console.error("Admin P1P2 module item POST error:", error);
    return NextResponse.json(
      { error: "Could not add exam to group" },
      { status: 500 },
    );
  }
}
