import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  visibleToStudents: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const modules = await prisma.paper12MockModule.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            blueprint: {
              include: {
                component: {
                  include: {
                    program: { include: { examLevel: true } },
                  },
                },
                sections: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Admin P1P2 modules GET error:", error);
    return NextResponse.json(
      { error: "Could not load mock groups" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = postSchema.parse(await req.json());

    const module = await prisma.paper12MockModule.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        visibleToStudents: body.visibleToStudents === true,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        createdBy: session.user.id,
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
    console.error("Admin P1P2 modules POST error:", error);
    return NextResponse.json(
      { error: "Could not create mock group" },
      { status: 500 },
    );
  }
}
