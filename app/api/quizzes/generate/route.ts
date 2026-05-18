import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuizFromNote } from "@/lib/ai";

const generateQuizSchema = z.object({
  noteId: z.string().min(1),
  questionCount: z.number().int().min(5).max(100).optional(),
  questionTypes: z.enum(["MCQ", "OPEN", "MIXED"]).optional(),
  timed: z.boolean().optional(),
  timeLimit: z.number().int().min(1).max(180).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, questionCount, questionTypes, timed, timeLimit, isPublic } =
      generateQuizSchema.parse(await req.json());

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

    if (note.status !== "READY" || !note.extractedText) {
      return NextResponse.json(
        {
          error:
            "Note is not ready for quiz generation. Please wait for processing to complete.",
        },
        { status: 400 },
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const plan = subscription?.status === "ACTIVE" ? subscription.plan : "FREE";
    const quizLimits: Record<string, number> = {
      FREE: 4,
      STARTER: 20,
      STANDARD: 60,
      PREMIUM: -1,
    };

    const quizLimit = quizLimits[plan] ?? quizLimits.FREE;
    const quizCount = await prisma.quiz.count({
      where: { userId: session.user.id },
    });

    if (quizLimit !== -1 && quizCount >= quizLimit) {
      return NextResponse.json(
        {
          error: `Quiz generation limit reached (${quizLimit}). Upgrade to generate more quizzes.`,
        },
        { status: 403 },
      );
    }

    const resolvedQuestionCount = questionCount || 10;
    const resolvedQuestionTypes = questionTypes || "MIXED";

    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        noteId: noteId || null,
        noteTitle: note.title,
        title: `Quiz - ${note.title}`,
        questionCount: 0,
        status: "GENERATING",
        isPublic: isPublic || false,
        timed: timed || false,
        timeLimit: timeLimit || null,
      },
    });

    console.log(
      `[API] Created quiz: ${quiz.id}, attempting synchronous generation...`,
    );

    console.log(`[API] Calling quiz generation AI...`);

    const generatedQuestions = await generateQuizFromNote(note.extractedText, {
      questionCount: resolvedQuestionCount,
      questionTypes: resolvedQuestionTypes,
    });

    console.log(`[API] AI returned ${generatedQuestions.length} questions`);

    if (generatedQuestions.length > 0) {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          questionCount: generatedQuestions.length,
          status: "READY",
          questions: {
            create: generatedQuestions.map((q, index) => ({
              type: q.type,
              question: q.question,
              options: q.type === "MCQ" ? q.options : [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              order: index,
            })),
          },
        },
      });
      console.log(
        `[API] Quiz saved successfully with ${generatedQuestions.length} questions`,
      );
    } else {
      console.error("[API] AI returned 0 valid questions", {
        quizId: quiz.id,
        noteId,
        questionCount: resolvedQuestionCount,
        questionTypes: resolvedQuestionTypes,
      });
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: { status: "ERROR" },
      });
      return NextResponse.json(
        {
          error:
            "Quiz generation failed because the AI response did not produce any valid questions. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ quiz, success: true });
  } catch (error) {
    console.error("Quiz generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid quiz configuration" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
