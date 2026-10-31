import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeOpenAnswer } from "@/lib/ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const gradeAnswerSchema = z.object({
  questionId: z.string().min(1),
  question: z.string().min(1),
  type: z.enum(["MCQ", "OPEN"]),
  userAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, question, type, userAnswer, correctAnswer } =
      gradeAnswerSchema.parse(await req.json());

    const stored = await prisma.quizQuestion.findFirst({
      where: { id: questionId },
      include: { quiz: { select: { userId: true } } },
    });
    if (!stored || stored.quiz.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    const marksTotal = stored.marks ?? 1;
    const schemeMd =
      stored.markSchemeMd ??
      `Correct answer earns ${marksTotal} mark${marksTotal === 1 ? "" : "s"}.`;
    const examinerNote = stored.examinerNote ?? "";

    let isCorrect = false;
    let why = "";
    let marksEarned = 0;

    if (type === "MCQ") {
      isCorrect = userAnswer.trim() === correctAnswer.trim();
      marksEarned = isCorrect ? marksTotal : 0;
      why = isCorrect
        ? "That's correct."
        : `Not quite — the correct answer is ${correctAnswer}.`;
    } else {
      const feedback = await gradeOpenAnswer(
        question,
        userAnswer,
        correctAnswer,
        session.user.id,
      );
      const scoreMatch = feedback.match(/(\d{1,3})/);
      const aiScore = scoreMatch ? Number(scoreMatch[1]) : 0;
      const safeScore = Math.min(100, Math.max(0, aiScore));
      isCorrect = safeScore >= 70;
      marksEarned = Math.min(
        marksTotal,
        Math.round((safeScore / 100) * marksTotal),
      );
      if (!isCorrect && marksEarned > marksTotal - 1 && marksTotal > 1) {
        marksEarned = marksTotal - 1;
      }
      if (isCorrect && marksEarned < marksTotal && safeScore >= 95) {
        marksEarned = marksTotal;
      }
      why = isCorrect ? `That's right. ${feedback}` : `Not quite — ${feedback}`;
    }

    return NextResponse.json({
      questionId,
      isCorrect,
      why,
      marksEarned,
      marksTotal,
      schemeMd,
      examinerNote,
    });
  } catch (error) {
    console.error("Grade answer error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid answer" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to grade answer" },
      { status: 500 },
    );
  }
}
