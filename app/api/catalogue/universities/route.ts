import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public catalogue index data: every university, optionally filtered by a
 * search query on the name. Public read access, no session required
 * (spec 0023).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";

    const universities = await prisma.university.findMany({
      where: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        faculties: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json({ universities });
  } catch (error) {
    console.error("Catalogue universities GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch universities" },
      { status: 500 },
    );
  }
}
