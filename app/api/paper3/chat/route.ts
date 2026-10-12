import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCritical } from "@/lib/ai/orchestrator";
import { auth } from "@/lib/auth";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { getActiveProfileId } from "@/lib/exam-profile";
import {
  creditEnforcementEffective,
  getPlatformSettings,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getPrompt, promptCallFields } from "@/lib/prompts/loader";

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
      ? attempt.detailedResults.find(
          (dr) => dr.questionId === currentQuestion.question.id,
        )
      : null;

    const resultsSummary = attempt.detailedResults.map((dr) => {
      const q = allQuestions.find(
        (mq) => mq.question.id === dr.questionId,
      )?.question;
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

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    const plan = subscription?.plan || "FREE";
    const isPaid = plan !== "FREE" && subscription?.status === "ACTIVE";

    const settings = await getPlatformSettings();
    const enforcement = creditEnforcementEffective(settings);
    const tutorCost = settings.creditCostAiTutorMessage;

    const lastContent =
      typeof messages[messages.length - 1]?.content === "string"
        ? messages[messages.length - 1].content
        : "";
    const referenceId = `${attemptId}:${crypto
      .createHash("sha256")
      .update(lastContent)
      .digest("hex")
      .slice(0, 32)}`;

    const responseSchema = z.object({
      response: z.string(),
    });

    let systemSection = "";

    if (currentQuestion) {
      const taskTypeHint = getTaskTypeHint(currentQuestion.question.taskType);

      const { text } = await getPrompt("paper3", "exam_review_question", {
        questionNumber: currentQuestion.question.questionNumber,
        title: currentQuestion.question.title,
        taskType: currentQuestion.question.taskType,
        marks: currentQuestion.marks,
        content:
          currentQuestion.question.contentMd ||
          currentQuestion.question.content,
        resultBlock: currentResult
          ? `**Student's Result:** ${currentResult.isCorrect ? "Correct" : "Incorrect"} (${currentResult.marksEarned}/${currentResult.totalMarks} marks)\n**Feedback:** ${currentResult.feedback || "No feedback available"}`
          : "",
        taskHint: taskTypeHint,
        conceptsBlock: currentQuestion.question.concepts?.length
          ? `**Concepts:** ${currentQuestion.question.concepts.join(", ")}`
          : "",
      });
      systemSection = text;
    } else {
      const { text } = await getPrompt("paper3", "exam_review_summary", {
        mockTitle: attempt.mock.title,
        subject: attempt.mock.subject,
        score: Math.round(attempt.score),
        correctCount: examSummary.correctCount,
        totalQuestions: examSummary.totalQuestions,
        wrongCount: examSummary.wrongCount,
        resultsBlock:
          resultsSummary.length > 0
            ? `## Question-by-Question Results\n${resultsSummary.map((r) => `- Q${r.questionNumber}: ${r.isCorrect ? "✅" : "❌"} (${r.marksEarned}/${r.totalMarks}) - ${r.title.slice(0, 50)}...`).join("\n")}`
            : "",
        feedbackBlock: currentResult?.feedbackMd
          ? `\n## AI Feedback\n${currentResult.feedbackMd}`
          : "",
      });
      systemSection = text;
    }

    const conversationHistory = messages
      .slice(-5)
      .map(
        (m: ChatMessage) =>
          `${m.role === "user" ? "User" : "TiC"}: ${m.content}`,
      )
      .join("\n");

    const { text: prompt, settings: promptSettings } = await getPrompt(
      "paper3",
      "exam_review_chat",
      {
        systemSection,
        conversationHistory,
        latestMessage: messages[messages.length - 1]?.content || "",
      },
    );

    const result = await generateCritical({
      task: "reasoning",
      schema: responseSchema,
      prompt,
      ...promptCallFields(promptSettings),
    });

    if (enforcement.aiTutor && tutorCost > 0) {
      try {
        const balance = await getUserCreditBalance(session.user.id);
        if (balance >= tutorCost) {
          await spendCredits({
            userId: session.user.id,
            amount: tutorCost,
            type: "AI_TUTOR_MESSAGE",
            description: `Paper 3 mock tutor (${attempt.mock.title})`,
            referenceId,
          });
        }
      } catch (err) {
        console.error("[Paper3 chat] Tutor credit debit failed:", err);
      }
    }

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
