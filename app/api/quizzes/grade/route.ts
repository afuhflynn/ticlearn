import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeOpenAnswer } from "@/lib/ai";
import { auth } from "@/lib/auth";

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

    let isCorrect = false;
    let why = "";

    if (type === "MCQ") {
      isCorrect = userAnswer.trim() === correctAnswer.trim();
      why = isCorrect
        ? "That's correct."
        : `Not quite — the correct answer is ${correctAnswer}.`;
    } else {
      // Open answers are graded by the model, the same task and cost as the
      // quiz page submit. The student's answer always precedes the explanation.
      const feedback = await gradeOpenAnswer(
        question,
        userAnswer,
        correctAnswer,
        session.user.id,
      );
      const scoreMatch = feedback.match(/(\d{1,3})/);
      const aiScore = scoreMatch ? Number(scoreMatch[1]) : 0;
      isCorrect = aiScore >= 70;
      why = isCorrect ? `That's right. ${feedback}` : `Not quite — ${feedback}`;
    }

    return NextResponse.json({
      questionId,
      isCorrect,
      why,
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
