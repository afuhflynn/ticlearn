import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const levels = await prisma.examLevel.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ levels });
  } catch (error) {
    console.error("Exam levels GET error:", error);
    return NextResponse.json({ error: "Failed to fetch exam levels" }, { status: 500 });
  }
}
