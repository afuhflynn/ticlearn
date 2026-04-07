import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateQuizFromNote } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, questionCount, questionTypes, timed, timeLimit, isPublic } =
      await req.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 },
      );
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: session.user.id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const extractedText = note.extractedText || note.fileUrl;
    const generatedQuestions = await generateQuizFromNote(extractedText, {
      questionCount: questionCount || 10,
      questionTypes: questionTypes || "MIXED",
    });

    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        noteId,
        noteTitle: note.title,
        title: `Quiz - ${note.title}`,
        questionCount: generatedQuestions.length,
        status: "READY",
        isPublic: isPublic || false,
        timed: timed || false,
        timeLimit: timeLimit || null,
        questions: {
          create: generatedQuestions.map((q, index) => ({
            type: q.type,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: index,
          })),
        },
      },
    });

    return NextResponse.json({ quiz, success: true });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
