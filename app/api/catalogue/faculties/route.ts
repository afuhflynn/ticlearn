import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public catalogue faculties: all faculties, optionally filtered by university
 * id. Public read access, no session required (spec 0023).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const universityId = searchParams.get("universityId") ?? undefined;

    const faculties = await prisma.faculty.findMany({
      where: universityId ? { universityId } : {},
      orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        universityId: true,
        university: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ faculties });
  } catch (error) {
    console.error("Catalogue faculties GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 },
    );
  }
}
