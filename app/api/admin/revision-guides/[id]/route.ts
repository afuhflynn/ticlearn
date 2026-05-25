import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  markdown: z.string().min(20).optional(),
  published: z.boolean().optional(),
  pdfUrl: z.string().url().nullable().optional(),
  pdfFileName: z.string().max(255).nullable().optional(),
});

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session.user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const guide = await prisma.revisionGuide.findUnique({ where: { id } });

    if (!guide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Admin revision guide GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revision guide" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const guide = await prisma.revisionGuide.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Admin revision guide PATCH error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update revision guide" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.revisionGuide.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin revision guide DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete revision guide" },
      { status: 500 },
    );
  }
}
