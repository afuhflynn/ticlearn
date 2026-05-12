import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examLevelId = searchParams.get("examLevelId");

    const where = examLevelId ? { examLevelId } : {};
    const programs = await prisma.program.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ programs });
  } catch (error) {
    console.error("Programs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}
