import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { getActiveProfileId } from "@/lib/exam-profile";

const aiModel = openai("gpt-5.5");

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
    const profileId = await getActiveProfileId(session.user.id);

    if (!attemptId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "attemptId and messages are required" },
        { status: 400 },
      );
    }

    const ownershipWhere = profileId
      ? { id: attemptId, examProfileId: profileId }
      : { id: attemptId, userId: session.user.id };

    const attempt = await prisma.paper3MockAttempt.findUnique({
      where: ownershipWhere,
      include: {
        mock: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { order: "asc" },
            },
          },
        },
        detailedResults: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const allQuestions = attempt.mock.questions;
    const currentQuestion = questionId
      ? allQuestions.find((mq) => mq.question.id === questionId)
      : null;
    
    const currentResult = currentQuestion
      ? attempt.detailedResults.find((dr) => dr.questionId === currentQuestion.question.id)
      : null;

    const resultsSummary = attempt.detailedResults.map((dr) => {
      const q = allQuestions.find((mq) => mq.question.id === dr.questionId)?.question;
      return {
        questionNumber: q?.questionNumber || "?",
        title: q?.title || "Unknown",
        isCorrect: dr.isCorrect,
        marksEarned: dr.marksEarned,
        totalMarks: dr.totalMarks,
      };
    });

    const examSummary = {
      totalQuestions: allQuestions.length,
      score: Math.round(attempt.score),
      correctCount: resultsSummary.filter((r) => r.isCorrect).length,
      wrongCount: resultsSummary.filter((r) => !r.isCorrect).length,
    };

    const responseSchema = z.object({
      response: z.string(),
    });

    let systemPrompt = "";
    
    if (currentQuestion) {
      const taskTypeHint = getTaskTypeHint(currentQuestion.question.taskType);
      
      systemPrompt = `You are TiC, an expert GCE Paper 3 tutor helping a student review their exam.

## Current Question
**Q${currentQuestion.question.questionNumber}: ${currentQuestion.question.title}**
Task Type: ${currentQuestion.question.taskType}
Marks: ${currentQuestion.marks}

**Question Content:**
${currentQuestion.question.contentMd || currentQuestion.question.content}

${currentResult ? `**Student's Result:** ${currentResult.isCorrect ? "Correct" : "Incorrect"} (${currentResult.marksEarned}/${currentResult.totalMarks} marks)
**Feedback:** ${currentResult.feedback || "No feedback available"}` : ""}

${taskTypeHint}

${currentQuestion.question.concepts?.length ? `**Concepts:** ${currentQuestion.question.concepts.join(", ")}` : ""}

Provide specific hints related to this question. Guide the student toward understanding the concept without giving away the exact answer.`;
    } else {
      systemPrompt = `You are TiC, an expert GCE Paper 3 tutor helping a student review their exam results.

## Exam Summary: ${attempt.mock.title}
- **Subject:** ${attempt.mock.subject}
- **Total Score:** ${Math.round(attempt.score)}%
- **Questions Correct:** ${examSummary.correctCount}/${examSummary.totalQuestions}
- **Questions to Review:** ${examSummary.wrongCount}

${resultsSummary.length > 0 ? `## Question-by-Question Results
${resultsSummary.map((r) => `- Q${r.questionNumber}: ${r.isCorrect ? "✅" : "❌"} (${r.marksEarned}/${r.totalMarks}) - ${r.title.slice(0, 50)}...`).join("\n")}` : ""}

${currentResult?.feedbackMd ? `\n## AI Feedback
${currentResult.feedbackMd}` : ""}

Provide encouraging and educational guidance. Help the student understand what they did well and where they can improve.`;
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

Respond as TiC with helpful guidance. Keep responses focused and educational.`;

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

function getTaskTypeHint(taskType: string): string {
  switch (taskType) {
    case "C_PROGRAM":
    case "PASCAL_PROGRAM":
      return `This is a programming question. Focus on:
- Function signature format (return type and parameters)
- Logic and algorithm structure
- Variable declarations and data types
- Control structures (loops, conditionals)`;
    
    case "WEB_PROGRAMMING":
      return `This is a web programming question (HTML/CSS). Focus on:
- HTML element structure and semantic tags
- Inline CSS styling
- Proper nesting and closing tags
- Content organization`;
    
    case "EXCEL_FORMULA":
    case "EXCEL_GRID":
      return `This is a spreadsheet question. Focus on:
- Formula syntax and cell references
- Built-in functions (SUM, IF, VLOOKUP, etc.)
- Relative and absolute references
- Data organization in cells`;
    
    case "SQL_QUERY":
    case "ACCESS_TABLE":
    case "ACCESS_RELATIONSHIP":
      return `This is a database question. Focus on:
- Query structure (SELECT, FROM, WHERE)
- Table relationships and keys
- Data manipulation commands
- Database design principles`;
    
    case "ALGORITHM_PSEUDOCODE":
      return `This is an algorithm/pseudocode question. Focus on:
- Step-by-step logic flow
- Variable initialization and updates
- Loop and conditional structures
- Clear, organized pseudocode format`;
    
    default:
      return "Review the question content and think through your approach step by step.";
  }
}