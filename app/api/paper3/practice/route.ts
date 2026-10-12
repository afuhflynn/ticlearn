import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserPaper3Subjects,
  getSubjectAllowedTaskTypes,
} from "@/lib/paper3/subject-tasks";

const ALL_TASK_TYPES = [
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
] as const;

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category");

    type WhereClause = Record<string, unknown>;
    const where: WhereClause = {
      status: "APPROVED",
    };

    const section = searchParams.get("section");
    const taskType = searchParams.get("taskType");
    const concepts = searchParams.get("concepts");

    if (section === "A" || section === "B") where.section = section;
    if (taskType && (ALL_TASK_TYPES as readonly string[]).includes(taskType)) {
      where.taskType = taskType;
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

    const userSubjects = await getUserPaper3Subjects(session.user.id);
    const allowedTaskTypes = getSubjectAllowedTaskTypes(userSubjects);
    if (allowedTaskTypes) {
      if (
        where.taskType &&
        !allowedTaskTypes.includes(where.taskType as string)
      ) {
        return NextResponse.json({ questions: [] });
      }
      if (!where.taskType) {
        where.taskType = { in: allowedTaskTypes };
      }
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
        requireAnswer: true,
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
