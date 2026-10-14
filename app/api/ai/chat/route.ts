import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { levelLabel } from "@/constants/levels";
import { generateTextWithFallback, streamChat } from "@/lib/ai/orchestrator";
import { createChatTools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";
import {
  extractTextFromParts,
  normalizeStoredParts,
} from "@/lib/chat-messages";
import { getChatResetWindow } from "@/lib/chat-usage";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { EVENTS, trackEvent } from "@/lib/kpi";
import { getPlanLimits, limitReached, resolvePlan } from "@/lib/plan-limits";
import {
  creditEnforcementEffective,
  getPlatformSettings,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getPrompt, getPromptOrFallback } from "@/lib/prompts/loader";
import { limit } from "@/lib/rate-limit";
import { computeReadiness } from "@/lib/readiness";

export const runtime = "nodejs";

/** How much of the attached note travels into the system prompt. */
const NOTE_CONTEXT_CHARS = 12_000;

async function generateTitle(
  userMessage: string,
  userId?: string | null,
): Promise<string> {
  try {
    const prompt = await getPromptOrFallback("chat", "chat_title", {
      userMessage,
    });
    const result = await generateTextWithFallback({
      task: "fast_chat",
    const result = await generateTextWithFallback({
      task: "fast_chat",
      prompt,
      userId: userId ?? null,
      userId: userId ?? null,
    });
    return result.text.trim().slice(0, 50) || "New Chat";
  } catch (e) {
    console.warn("[Chat] Title gen failed:", e);
    return "New Chat";
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

    const nextReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
    });
    const rateLimitResponse = await limit("ai", nextReq as any);
    if (rateLimitResponse) return rateLimitResponse;

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

    if (messages.length > 50) {
      return NextResponse.json(
        { error: "Too many messages (max 50)" },
        { status: 400 },
      );
    }

    for (const message of messages) {
      if (message.parts && Array.isArray(message.parts)) {
        for (const part of message.parts) {
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            if (typeof text === "string" && text.length > 8000) {
              return NextResponse.json(
                { error: "Message too long (max 8000 characters)" },
                { status: 400 },
              );
            }
          }
        }
      }
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
      include: {
        _count: { select: { messages: true } },
        note: {
          select: { id: true, title: true, extractedText: true, userId: true },
        },
      },
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

    const plan = resolvePlan(subscription);
    const isPaid = plan !== "FREE";
    const { aiTutorMessages: chatLimit, maxConversationMessages } =
      getPlanLimits(plan);

    const settings = await getPlatformSettings();
    const enforcement = creditEnforcementEffective(settings);
    const tutorCost = settings.creditCostAiTutorMessage;

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
      if (limitReached(chatLimit, chatsToday)) {
        return NextResponse.json(
          {
            error:
              "Your daily AI chat allowance is exhausted. You can still read previous conversations until the next reset.",
          },
          { status: 403 },
        );
      }
    }

    if (limitReached(maxConversationMessages, conversation._count.messages)) {
      return NextResponse.json(
        {
          error: `This conversation has reached the ${maxConversationMessages}-message limit. Please start a new conversation to continue.`,
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
        return (
          existing === input || (input.length >= 10 && existing.includes(input))
        );
      });
      if (isDuplicate) {
        console.warn(
          `[CHAT] Possible duplicate message in conversation ${conversationId}`,
        );
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
        const newTitle = await generateTitle(userContent, userId);
        const newTitle = await generateTitle(userContent, userId);
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { title: newTitle },
        });
      } catch (titleError) {
        console.error("[CHAT] Failed to generate title:", titleError);
      }
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

    let profileContext = "";

    try {
      const readiness = await computeReadiness(userId);
    try {
      const readiness = await computeReadiness(userId);

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
- Overall Readiness: ${readiness.readiness}%
${readiness.weakestTopic ? `- Weakest Topics: ${weakestThree}` : ""}
${readiness.strongestTopic ? `- Strongest Topic: ${readiness.strongestTopic.name} (${readiness.strongestTopic.score}%)` : ""}
${recommendations ? `- ${recommendations}` : ""}

Use this to personalise study recommendations and focus on the weakest topics.
`;
    } catch (e) {
      console.error("Failed to compute readiness for chat context:", e);
    }

    const { text: systemPrompt, settings: promptSettings } = await getPrompt(
      "chat",
      "chat_system",
      {
        userName: session.user.name,
        studentLevel,
        noteContext,
        profileContext,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
      },
      { tools: true },
    );

    const modelMessages = await convertToModelMessages(messages);

    const tools = createChatTools({ userId: session.user.id });

    const result = await streamChat({
      task: "fast_chat",
      system: systemPrompt,
      tools,
      messages: modelMessages,
      userId: session.user.id,
      modelOptions: {
        stopWhen: stepCountIs(5),
        temperature: promptSettings.heat,
        maxOutputTokens: promptSettings.cap,
      },
      userId: session.user.id,
      modelOptions: {
        stopWhen: stepCountIs(5),
        temperature: promptSettings.heat,
        maxOutputTokens: promptSettings.cap,
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (err) => {
        console.error("[Chat] stream error:", err);
        return "Failed to generate response.";
      },
      onFinish: async ({ isAborted, responseMessage }) => {
        try {
          if (isAborted) return;

          const assistantParts = normalizeStoredParts(responseMessage.parts);
          const assistantContent = extractTextFromParts(assistantParts);

          await saveMessage(
            conversationId,
            userId,
            "assistant",
            assistantContent,
            assistantParts,
          );

          if (enforcement.aiTutor && tutorCost > 0) {
            try {
              const balance = await getUserCreditBalance(userId);
              if (balance >= tutorCost) {
                await spendCredits({
                  userId,
                  amount: tutorCost,
                  type: "AI_TUTOR_MESSAGE",
                  description: "Tip tutor message",
                  referenceId: userMsgRecord.id,
                });
              }
            } catch (err) {
              console.error("[CHAT] Tutor credit debit failed:", err);
            }
          }
        } catch (err) {
          console.error("[CHAT] onFinish failed:", err);
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
