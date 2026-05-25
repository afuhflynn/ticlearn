import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  visibleToStudents: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type RouteCtx = { params: Promise<{ moduleId: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
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
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.paper12MockModule.findUnique({
      where: { id: moduleId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const module = await prisma.paper12MockModule.update({
      where: { id: moduleId },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(typeof body.visibleToStudents === "boolean"
          ? { visibleToStudents: body.visibleToStudents }
          : {}),
        ...(typeof body.sortOrder === "number"
          ? { sortOrder: body.sortOrder }
          : {}),
      },
    });

    return NextResponse.json({ module });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    console.error("Admin P1P2 module PATCH error:", error);
    return NextResponse.json(
      { error: "Could not update mock group" },
      { status: 500 },
    );
  }
}

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

    const { moduleId } = await ctx.params;

    await prisma.paper12MockModule.delete({
      where: { id: moduleId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin P1P2 module DELETE error:", error);
    return NextResponse.json(
      { error: "Could not delete mock group" },
      { status: 500 },
    );
  }
}
