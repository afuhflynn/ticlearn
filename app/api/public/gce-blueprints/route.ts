import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { examBlueprintToPublic } from "@/lib/public-gce-catalog";

export const revalidate = 120;

/**
 * Marketing / landing: GCE practice blueprints students can see in-app
 * (`visibleForStudents`). Prefer community-featured rows; otherwise any
 * student-visible catalog sample.
 */
export async function GET() {
  try {
    const community = await prisma.examBlueprint.findMany({
      where: {
        visibleForStudents: true,
        visibleInCommunity: true,
      },
      take: 12,
      orderBy: { updatedAt: "desc" },
      include: {
        sections: { orderBy: { order: "asc" } },
        component: {
          select: {
            name: true,
            code: true,
            program: { select: { name: true } },
          },
        },
      },
    });

    const source =
      community.length > 0
        ? community
        : await prisma.examBlueprint.findMany({
            where: { visibleForStudents: true },
            take: 12,
            orderBy: { updatedAt: "desc" },
            include: {
              sections: { orderBy: { order: "asc" } },
              component: {
                select: {
                  name: true,
                  code: true,
                  program: { select: { name: true } },
                },
              },
            },
          });

    const blueprints = source.map((bp) => examBlueprintToPublic(bp));

    return NextResponse.json(
      { blueprints, source: community.length > 0 ? "community" : "catalog" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Public GCE blueprints GET error:", error);
    return NextResponse.json(
      { error: "Could not load mocks" },
      { status: 500 },
    );
  }
}
