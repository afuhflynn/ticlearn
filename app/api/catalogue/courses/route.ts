import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public catalogue courses: all courses, optionally filtered by faculty id.
 * Public read access, no session required (spec 0023).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get("facultyId") ?? undefined;

    const courses = await prisma.course.findMany({
      where: facultyId ? { facultyId } : {},
      orderBy: [{ title: "asc" }, { code: "asc" }],
      select: {
        id: true,
        title: true,
        code: true,
        credits: true,
        description: true,
        facultyId: true,
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Catalogue courses GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
