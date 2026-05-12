import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const componentId = searchParams.get("componentId");

    const where = componentId ? { componentId } : {};
    const sources = await prisma.examSource.findMany({
      where,
      orderBy: [{ year: "desc" }, { sessionName: "asc" }],
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Exam sources GET error:", error);
    return NextResponse.json({ error: "Failed to fetch exam sources" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { componentId, year, sessionName } = await req.json();

    if (!componentId || !year || !sessionName) {
      return NextResponse.json({ error: "componentId, year, and sessionName are required" }, { status: 400 });
    }

    const source = await prisma.examSource.upsert({
      where: { componentId_year: { componentId, year } },
      update: { sessionName },
      create: { componentId, year, sessionName },
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Exam sources POST error:", error);
    return NextResponse.json({ error: "Failed to create exam source" }, { status: 500 });
  }
}
