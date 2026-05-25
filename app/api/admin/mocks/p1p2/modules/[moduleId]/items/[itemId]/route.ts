import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteCtx = {
  params: Promise<{ moduleId: string; itemId: string }>;
};

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { moduleId, itemId } = await ctx.params;

    const row = await prisma.paper12MockModuleItem.findFirst({
      where: { id: itemId, moduleId },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.paper12MockModuleItem.delete({ where: { id: itemId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin P1P2 module item DELETE error:", error);
    return NextResponse.json(
      { error: "Could not remove exam from group" },
      { status: 500 },
    );
  }
}
