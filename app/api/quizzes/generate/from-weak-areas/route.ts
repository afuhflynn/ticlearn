import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

const generateFromWeakAreasSchema = z.object({
  questionCount: z.number().int().min(5).max(50).optional(),
  timed: z.boolean().optional(),
  timeLimit: z.number().int().min(1).max(180).nullable().optional(),
  isPublic: z.boolean().optional(),
});

const CREDITS_COST = 50;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = generateFromWeakAreasSchema.parse(await req.json());
    const { questionCount = 10, timed = false, timeLimit, isPublic = false } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, totalCreditsEarned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.credits < CREDITS_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${CREDITS_COST} credits to generate quiz from weak areas.` },
        { status: 402 },
      );
    }

    const paper3Stats = await prisma.paper3UserStats.findFirst({
      where: { userId: session.user.id },
    });

    const weakConcepts = paper3Stats?.weakConcepts ?? [];
    const readinessScore = paper3Stats?.readinessScore ?? 0;

    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
        status: "READY",
        extractedText: { not: null },
      },
      select: {
        id: true,
        title: true,
        extractedText: true,
        subject: true,
      },
      take: 5,
    });

    if (notes.length === 0) {
      return NextResponse.json(
        { error: "No processed notes found. Upload notes first to generate quizzes from weak areas." },
        { status: 400 },
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        noteId: notes[0].id,
        noteTitle: notes[0].title,
        title: `Quiz: Weak Areas (${weakConcepts.slice(0, 3).join(", ") || "General"})`,
        questionCount: questionCount,
        status: "GENERATING",
        isPublic: isPublic,
        timed: timed,
        timeLimit: timeLimit,
        metadata: {
          source: "weak-areas",
          weakConcepts: weakConcepts,
          readinessScore: readinessScore,
          notesUsed: notes.map(n => n.id),
        },
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        credits: { decrement: CREDITS_COST },
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userId: session.user.id,
        amount: -CREDITS_COST,
        type: "QUIZ_GENERATION",
        description: `Quiz generation from weak areas (${weakConcepts.slice(0, 3).join(", ") || "general"})`,
        referenceId: quiz.id,
      },
    });

    try {
      await inngest.send({
        name: "quiz/generate-from-weak-areas",
        data: {
          quizId: quiz.id,
          userId: session.user.id,
          weakConcepts: weakConcepts,
          notes: notes.map(n => ({
            id: n.id,
            title: n.title,
            extractedText: n.extractedText,
            subject: n.subject,
          })),
          questionCount,
          readinessScore,
        },
      });
    } catch (inngestError) {
      console.error("Failed to send Inngest event:", inngestError);
    }

    return NextResponse.json({
      quizId: quiz.id,
      status: "GENERATING",
      creditsUsed: CREDITS_COST,
      weakAreasTargeted: weakConcepts.slice(0, 5),
      message: "Quiz generation started. You will be notified when ready.",
    });
  } catch (error) {
    console.error("Generate quiz from weak areas error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}