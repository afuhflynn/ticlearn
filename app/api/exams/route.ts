import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateExamQuestions } from "@/lib/ai";

type JsonData = Record<string, unknown> | unknown[];

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exams = await prisma.examSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Exams GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, topic, mode, questionCount } = await req.json();

    if (!subject || !topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const generatedQuestions = await generateExamQuestions(
      subject,
      topic,
      questionCount || 50,
    );

    const exam = await prisma.examSession.create({
      data: {
        userId: session.user.id,
        subject: subject as "CS" | "ICT",
        subjectLabel: subject === "CS" ? "Computer Science" : "ICT",
        mode: mode || "MOCK",
        topic,
        timeLimit: 7200,
        status: "READY",
        questions: JSON.stringify(generatedQuestions) as unknown as any,
      },
    });

    return NextResponse.json({ exam, success: true });
  } catch (error) {
    console.error("Exam generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate exam" },
      { status: 500 },
    );
  }
}
