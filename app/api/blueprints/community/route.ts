import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Curated mocks visible on the Community page (Paper 1 & 2 blueprints). */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blueprints = await prisma.examBlueprint.findMany({
      where: { visibleInCommunity: true },
      include: {
        sections: { orderBy: { order: "asc" } },
        component: {
          include: {
            program: { include: { examLevel: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("Community blueprints GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 },
    );
  }
}
