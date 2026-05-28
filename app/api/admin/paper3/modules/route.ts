import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  visibleToAllStudents: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
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

    const modules = await prisma.paper3MockModule.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { mocks: true } },
        mocks: {
          select: {
            id: true,
            title: true,
            subject: true,
            status: true,
            focusCategory: true,
            timeLimit: true,
            totalMarks: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Admin paper3 modules GET error:", error);
    return NextResponse.json(
      { error: "Failed to load modules" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = createSchema.parse(await req.json());

    const mod = await prisma.paper3MockModule.create({
      data: {
        title: body.title,
        description: body.description,
        sortOrder: body.sortOrder ?? 0,
        visibleToAllStudents: body.visibleToAllStudents ?? false,
        status: body.status ?? "DRAFT",
        createdBy: admin.id,
      },
    });

    return NextResponse.json({ module: mod });
  } catch (error) {
    console.error("Admin paper3 modules POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 },
    );
  }
}
