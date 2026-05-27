import {
  convertToModelMessages,
  generateObject,
  generateText,
  stepCountIs,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createChatTools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";
import { getTaskConfig } from "@/lib/ai/registry";
import { geminiFlash } from "@/lib/ai/instances";
import { trackEvent, EVENTS } from "@/lib/kpi";
import {
  extractTextFromParts,
  normalizeStoredParts,
} from "@/lib/chat-messages";
import { getChatResetWindow } from "@/lib/chat-usage";
import { prisma } from "@/lib/prisma";
import { getActiveProfileId } from "@/lib/exam-profile";
import { computeReadiness } from "@/lib/readiness";
import crypto from "crypto";
import { z } from "zod";
import {
  creditEnforcementEffective,
  getPlatformSettings,
} from "@/lib/platform-settings";
import {
  getUserCreditBalance,
  spendCredits,
} from "@/lib/credits";

export const runtime = "nodejs";

const chatConfig = getTaskConfig("reasoning");

function modelName(model: LanguageModel): string {
  try {
    return (model as unknown as { modelId?: string }).modelId || String(model);
  } catch {
    return "unknown";
  }
}

async function generateTitle(userMessage: string): Promise<string> {
  const errors: string[] = [];
  for (const m of chatConfig.chain) {
    try {
      const result = await generateText({
        model: m,
        maxRetries: 0,
        prompt: `Generate a short (max 50 characters), descriptive title for this conversation based on the user's first message.
The title should be concise and capture the main topic.
Do not use quotes or special characters in the title.

User message: "${userMessage}"

Respond with only the title, nothing else.`,
      });

      return result.text.trim().slice(0, 50);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${modelName(m)}: ${msg}`);
      console.warn(`[Chat] Title gen failed for ${modelName(m)}: ${msg}`);
    }
  }
  console.error("[Chat] All models failed for title generation:", errors.join("; "));
  return "New Chat";
}

function messageHasImage(parts: UIMessage["parts"]): string | null {
  for (const part of parts) {
    if (part.type === "file") {
      const filePart = part as { mediaType?: string; mimeType?: string; url?: string; data?: string };
      const contentType = filePart.mediaType || filePart.mimeType || "";
      if (contentType.startsWith("image/")) {
        return filePart.data || filePart.url || null;
      }
    }
  }
  return null;
}

async function processImageQuestion(
  imageUrl: string,
  userId: string,
  conversationId: string,
) {
  try {
    const profileId = await getActiveProfileId(userId);
    if (!profileId) return;

    const profile = await prisma.examProfile.findUnique({
      where: { id: profileId },
      include: {
        programs: {
          include: {
            program: { include: { components: { include: { topics: true } } } },
          },
        },
      },
    });
    if (!profile) return;

    // Step 1: Extract question text from image
    const extraction = await generateObject({
      model: geminiFlash,
      schema: z.object({
        questionText: z.string(),
        isQuestion: z.boolean(),
      }),
      system:
        "Extract the exam question text from this image. If it's not a question, mark isQuestion as false.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url" as const, image_url: { url: imageUrl } },
            {
              type: "text" as const,
              text: "Extract the question from this image.",
            },
          ],
        } as never,
      ],
    });

    if (!extraction.object.isQuestion || !extraction.object.questionText)
      return;

    const text = extraction.object.questionText.substring(0, 2000);

    // Step 2: Detect topic
    const allTopics = profile.programs.flatMap((p) =>
      p.program.components.flatMap((c) => c.topics),
    );
    const topicNames = allTopics.map((t) => t.name);

    const classification = await generateObject({
      model: geminiFlash,
      schema: z.object({
        topicIdx: z.number().optional(),
        isClassified: z.boolean(),
      }),
      system: `Classify this question into one of these topics: ${topicNames.join(", ")}. Return the index (0-based) of the best matching topic.`,
      prompt: `Question: ${text.substring(0, 500)}`,
    });

    const matchedTopic = classification.object.isClassified
      ? allTopics[classification.object.topicIdx ?? -1]
      : null;

    // Step 3: Save to Question table
    const hash = crypto
      .createHash("sha256")
      .update(text.toLowerCase().trim())
      .digest("hex");

    const existing = await prisma.question.findFirst({
      where: { text: { startsWith: text.substring(0, 100) } },
    });

    if (!existing) {
      await prisma.question.create({
        data: {
          componentId:
            matchedTopic?.componentId ??
            profile.programs[0]?.program.components[0]?.id ??
            "",
          topicId: matchedTopic?.id ?? null,
          text,
          type: "STRUCTURED",
          sourceType: "USER_UPLOADED",
        },
      });
    }
  } catch (e) {
    console.error("Image processing error:", e);
  }
}

async function saveMessage(
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  parts: unknown,
) {
  const msg = await prisma.chatMessage.create({
    data: {
      conversationId,
      userId,
      role,
      content,
      parts: parts as never,
    },
  });

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return msg;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      messages?: UIMessage[];
    };
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    const conversation = await prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
      include: { _count: { select: { messages: true } } },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return NextResponse.json(
        { error: "A user message is required" },
        { status: 400 },
      );
    }

    // Get user's subscription and check limits / credits
    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const plan = subscription?.plan || "FREE";
    const isPaid = plan !== "FREE" && subscription?.status === "ACTIVE";

    const settings = await getPlatformSettings();
    const enforcement = creditEnforcementEffective(settings);
    const tutorCost = settings.creditCostAiTutorMessage;
    const tutorCreditsGate =
      enforcement.aiTutor && tutorCost > 0 && !isPaid;

    // Define daily message limits per plan
    const dailyLimits: Record<string, number> = {
      FREE: 8,
      STARTER: -1,
      STANDARD: -1,
      PREMIUM: -1,
    };

    const chatLimit = dailyLimits[plan] || 8;

    const { nextResetAt, windowStart } = getChatResetWindow();
    const chatsToday = await prisma.chatMessage.count({
      where: {
        userId,
        role: "user",
        createdAt: {
          gte: windowStart,
          lt: nextResetAt,
        },
      },
    });

    if (!isPaid) {
      if (tutorCreditsGate) {
        const balance = await getUserCreditBalance(userId);
        if (balance < tutorCost) {
          return NextResponse.json(
            {
              error: `Insufficient credits. Need ${tutorCost} credits per tutor message.`,
              balance,
              requiredCredits: tutorCost,
            },
            { status: 402 },
          );
        }
      } else if (chatLimit !== -1 && chatsToday >= chatLimit) {
        return NextResponse.json(
          {
            error:
              "Your daily AI chat allowance is exhausted. You can still read previous conversations until the next reset.",
          },
          { status: 403 },
        );
      }
    }

    // Conversation length limit per plan
    const conversationLimits: Record<string, number> = {
      FREE: 50,
      STARTER: 100,
      STANDARD: 200,
      PREMIUM: 500,
    };
    const maxMessagesPerConversation = conversationLimits[plan] ?? 50;
    if (
      conversation._count.messages >= maxMessagesPerConversation
    ) {
      return NextResponse.json(
        {
          error: `This conversation has reached the ${maxMessagesPerConversation}-message limit. Please start a new conversation to continue.`,
        },
        { status: 403 },
      );
    }

    const normalizedUserParts = normalizeStoredParts(latestUserMessage.parts);
    const userContent = extractTextFromParts(normalizedUserParts);

    // Log potential duplicates (non-blocking)
    try {
      const recentUserMessages = await prisma.chatMessage.findMany({
        where: { conversationId, role: "user" },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { content: true },
      });
      const isDuplicate = recentUserMessages.some((msg) => {
        const existing = msg.content.trim().toLowerCase();
        const input = userContent.trim().toLowerCase();
        return existing === input || (input.length >= 10 && existing.includes(input));
      });
      if (isDuplicate) {
        console.warn(`[CHAT] Possible duplicate message in conversation ${conversationId}`);
      }
    } catch {
      // Non-critical; don't block the user
    }

    const userMsgRecord = await saveMessage(
      conversationId,
      userId,
      "user",
      userContent,
      normalizedUserParts,
    );

    trackEvent(userId, EVENTS.CHAT_MESSAGE, { conversationId }).catch(() => {});

    if (
      conversation._count.messages === 0 &&
      conversation.title === "New Chat"
    ) {
      try {
        const newTitle = await generateTitle(userContent);
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { title: newTitle },
        });
      } catch (titleError) {
        console.error("[CHAT] Failed to generate title:", titleError);
      }
    }

    // If user message contains an image, process and store it
    const imageUrl = messageHasImage(latestUserMessage.parts || []);
    if (imageUrl) {
      processImageQuestion(imageUrl, userId, conversationId).catch(
        console.error,
      );
    }

    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      await prisma.userStats.create({
        data: {
          userId,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalChats: 1,
        },
      });
    } else {
      await prisma.userStats.updateMany({
        where: { userId },
        data: {
          totalChats: { increment: 1 },
        },
      });
    }

    const profileId = await getActiveProfileId(userId);
    let profileContext = "";

    if (profileId) {
      try {
        const readiness = await computeReadiness(profileId);

        const programsList = readiness.programReadiness
          .map((p) => `${p.program}: ${p.readiness}%`)
          .join(", ");

        const weakestThree = readiness.topicReadiness
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .map((t) => `${t.topic} (${t.score}%)`)
          .join(", ");

        const recommendations = readiness.weakestTopic
          ? `Focus area: ${readiness.weakestTopic.name} (${readiness.weakestTopic.score}%)`
          : "";

        profileContext = `\n
STUDENT PROFILE:
- Programs: ${programsList || "Not set"}
- Overall Readiness: ${readiness.readiness}%
${readiness.weakestTopic ? `- Weakest Topics: ${weakestThree}` : ""}
${readiness.strongestTopic ? `- Strongest Topic: ${readiness.strongestTopic.name} (${readiness.strongestTopic.score}%)` : ""}
${readiness.daysUntilExam !== null ? `- Days Until Exam: ${readiness.daysUntilExam}` : ""}
${readiness.highRisk ? "- ⚠️ HIGH RISK: Exam is approaching and readiness is low" : ""}
${recommendations ? `- ${recommendations}` : ""}

Use this profile to personalize study recommendations, focus on weakest topics, and align advice with the student's current readiness level.
`;
      } catch (e) {
        console.error("Failed to compute readiness for chat context:", e);
      }
    }

    const systemPrompt = `You are TiCLearn AI and your name is TiC, an intelligent study assistant specialized in helping Cameroon GCE A-Level students.
    NOTE:
    1. Here is the users name use it to make the conversation more personal: ${session.user.name}.
    2. Avoid using too many emojis. Be friendly and use emojis only when necessary but be clean and serious.
    ${profileContext}

Your expertise:
- Computer Science and ICT (GCE A-Level syllabus)
- Biology, Chemistry, Physics, Mathematics
- General academic tutoring and exam preparation

TOOLS YOU CAN USE:
- webSearch: use for current information, recent changes, live facts, and up-to-date web knowledge
- getUserNotes: list the current user's notes and their processing status
- searchNotes: search inside the current user's notes by title, subject, summary, and extracted text
- getNoteContext: inspect one note in depth, including summary, key points, topics, extracted text, and related quizzes
- getUserQuizzes: list quizzes the user owns or can access
- getQuizContext: inspect one quiz, including questions and the user's recent attempts
- getQuizAttemptHistory: review recent quiz attempts and answer breakdowns
- getStudyProgress: inspect the user's points, streak, averages, and note/quiz counts
- getSubscriptionContext: inspect the user's current plan and feature-access status
- createQuiz: create a fully-formed quiz for the user - linked to one of their notes or standalone on any topic - with all questions generated in one shot; use this whenever the user asks to generate, make, or create a quiz

TOOL USAGE RULES:
- Prefer first-party tools over generic advice whenever the user asks about their notes, quizzes, progress, or limits
- Use webSearch when a question depends on current external information
- Do not claim to have used a tool unless you actually used it
- Do not invent note contents, quiz results, or account status
- If the available tools do not provide enough information, say so plainly
- Keep private user data scoped to the authenTiCted user only

Guidelines:
- Be encouraging and supportive
- Explain concepts clearly with examples
- Use examples from the Cameroon GCE A-Level curriculum when relevant
- Stay focused on educational topics
- If asked about non-educational topics, politely redirect
- Keep responses concise but informative
`;

    const modelMessages = await convertToModelMessages(messages);

    const tools = createChatTools({ userId: session.user.id });

    // Health-check models first: streamText doesn't throw synchronously for API errors (e.g. 429 quota).
    // A 429 from OpenAI would be lost to the response stream, never caught by try/catch.
    let workingModel: LanguageModel | null = null;
    const healthErrors: string[] = [];
    for (const m of chatConfig.chain) {
      try {
        await generateText({
          model: m,
          prompt: ".",
          maxOutputTokens: 1,
          maxRetries: 0,
        });
        workingModel = m;
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        healthErrors.push(`${modelName(m)}: ${msg}`);
        console.warn(`[Chat] Health check failed for ${modelName(m)}: ${msg}`);
      }
    }

    if (!workingModel) {
      console.error("[Chat] All models failed health check:", healthErrors.join("; "));
      return NextResponse.json(
        { error: "No AI models available. Please try again later." },
        { status: 503 },
      );
    }

    const result = streamText({
      model: workingModel,
      system: systemPrompt,
      tools,
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      maxRetries: 0,
    });

    return result.toUIMessageStreamResponse({
      onFinish: async ({ isAborted, responseMessage }) => {
        if (isAborted) {
          return;
        }

        const assistantParts = normalizeStoredParts(responseMessage.parts);
        const assistantContent = extractTextFromParts(assistantParts);

        await saveMessage(
          conversationId,
          userId,
          "assistant",
          assistantContent,
          assistantParts,
        );

        if (tutorCreditsGate) {
          try {
            await spendCredits({
              userId,
              amount: tutorCost,
              type: "AI_TUTOR_MESSAGE",
              description: "TiC AI tutor message",
              referenceId: userMsgRecord.id,
            });
          } catch (err) {
            console.error("[CHAT] Tutor credit debit failed:", err);
          }
        }
      },
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
