import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { examBlueprintToPublic } from "@/lib/public-gce-catalog";

export const revalidate = 120;

/**
 * Landing / marketing: Paper 1 & 2 mock **groups** (`visibleToStudents`).
 * No auth — same bundles students see when logged in, without program filtering
 * (preview for prospects; eligibility still enforced in-app).
 */
export async function GET() {
  try {
    const modules = await prisma.paper12MockModule.findMany({
      where: { visibleToStudents: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          where: {
            blueprint: { visibleForStudents: true },
          },
          include: {
            blueprint: {
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
            },
          },
        },
      },
    });

    const out = modules
      .map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        items: mod.items.map((it) => ({
          id: it.id,
          blueprint: examBlueprintToPublic(it.blueprint),
        })),
      }))
      .filter((m) => m.items.length > 0);

    return NextResponse.json(
      { modules: out },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Public P1P2 mock modules GET error:", error);
    return NextResponse.json(
      { error: "Could not load mock groups" },
      { status: 500 },
    );
  }
}
