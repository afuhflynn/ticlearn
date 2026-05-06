import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mockId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mockId } = await params;

    const mock = await prisma.paper3Mock.findUnique({
      where: { id: mockId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!mock) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    return NextResponse.json({ mock });
  } catch (error) {
    console.error("Paper3 mock GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mock" },
      { status: 500 },
    );
  }
}
