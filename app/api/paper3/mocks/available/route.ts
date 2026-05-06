import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mocks = await prisma.paper3Mock.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        timeLimit: true,
        totalMarks: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ mocks });
  } catch (error) {
    console.error("Paper3 mocks available GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 },
    );
  }
}
