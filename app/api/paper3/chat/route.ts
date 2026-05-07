import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const aiModel = openai("gpt-5.1-chat-latest");

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId, questionId, messages } = await req.json();

    if (!attemptId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "attemptId and messages are required" },
        { status: 400 },
      );
    }

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: { id: attemptId, userId: session.user.id },
      include: {
        mock: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const allQuestions = attempt.mock.questions;
    const questionContent = questionId
      ? allQuestions.find((mq) => mq.question.id === questionId)
      : null;

    const responseSchema = z.object({
      response: z.string(),
    });

    let systemPrompt = "";
    if (questionContent) {
      systemPrompt = `You are TiC, an expert GCE Paper 3 tutor helping a student with this question.

Question: ${questionContent.question.title}
${questionContent.question.contentMd || questionContent.question.content}

${
  questionContent.question.taskType === "C_PROGRAM" ||
  questionContent.question.taskType === "PASCAL_PROGRAM"
    ? `The task is a ${questionContent.question.taskType} programming question. Give hints about the function signature and logic, not the full solution.`
    : "Provide helpful hints without giving away the final answer."
}

Marks: ${questionContent.marks}
Expected answer format: ${questionContent.question.expectedAnswer}`;
    } else {
      systemPrompt = `You are TiC, an expert GCE Paper 3 tutor helping a student with their exam.

The exam covers ${attempt.mock.subject} - ${attempt.mock.title}.

Provide encouraging guidance and hints. Do not give direct answers.`;
    }

    const conversationHistory = messages
      .slice(-5)
      .map(
        (m: ChatMessage) =>
          `${m.role === "user" ? "User" : "TiC"}: ${m.content}`,
      )
      .join("\n");

    const prompt = `${systemPrompt}

Recent conversation:
${conversationHistory}

User's latest message: ${messages[messages.length - 1]?.content || ""}

Respond as TiC with a helpful hint or encouragement. Keep responses concise (2-3 sentences max).`;

    const result = await generateObject({
      model: aiModel,
      schema: responseSchema,
      prompt,
    });

    return NextResponse.json({ response: result.object.response });
  } catch (error) {
    console.error("Paper3 chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 },
    );
  }
}
