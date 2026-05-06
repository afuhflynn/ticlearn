import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // const section = searchParams.get("section");
    // const taskType = searchParams.get("taskType");
    // const concepts = searchParams.get("concepts");
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category");

    const where: {
      status: "APPROVED";
      section?: "A" | "B";
      taskType?:
        | "EXCEL_FORMULA"
        | "EXCEL_GRID"
        | "ACCESS_TABLE"
        | "ACCESS_RELATIONSHIP"
        | "SQL_QUERY"
        | "C_PROGRAM"
        | "PASCAL_PROGRAM"
        | "WEB_PROGRAMMING"
        | "ALGORITHM_PSEUDOCODE"
        | "INPUT_FIELD";
      concepts?: { hasSome: string[] };
      source?: {
        category?: "DATABASE" | "SPREADSHEET" | "PROGRAMMING";
      };
    } = {
      status: "APPROVED",
    };
    const section = searchParams.get("section");
    const taskType = searchParams.get("taskType");
    const concepts = searchParams.get("concepts");

    if (section === "A" || section === "B") where.section = section;
    if (
      taskType &&
      [
        "EXCEL_FORMULA",
        "EXCEL_GRID",
        "ACCESS_TABLE",
        "ACCESS_RELATIONSHIP",
        "SQL_QUERY",
        "C_PROGRAM",
        "PASCAL_PROGRAM",
        "WEB_PROGRAMMING",
        "ALGORITHM_PSEUDOCODE",
        "INPUT_FIELD",
      ].includes(taskType)
    ) {
      where.taskType = taskType as NonNullable<typeof where.taskType>;
    }
    if (concepts) where.concepts = { hasSome: concepts.split(",") };
    if (category === "WEB_PROGRAMMING") {
      where.taskType = "WEB_PROGRAMMING";
    } else if (
      category &&
      ["DATABASE", "SPREADSHEET", "PROGRAMMING"].includes(category)
    ) {
      where.source = {
        category: category as "DATABASE" | "SPREADSHEET" | "PROGRAMMING",
      };
    }

    const questions = await prisma.paper3Question.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        section: true,
        taskType: true,
        programmingLanguage: true,
        concepts: true,
        content: true,
        contentMd: true,
        marks: true,
        visualElements: true,
        taskItems: true,
        explanation: true,
        expectedAnswer: true,
        markingBreakdown: true,
        source: {
          select: {
            id: true,
            title: true,
            category: true,
            subject: true,
          },
        },
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Paper3 practice GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice questions" },
      { status: 500 },
    );
  }
}
