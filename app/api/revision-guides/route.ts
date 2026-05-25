import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guides = await prisma.revisionGuide.findMany({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        focus: true,
        pdfUrl: true,
        pdfFileName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ guides });
  } catch (error) {
    console.error("Revision guides GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revision guides" },
      { status: 500 },
    );
  }
}
