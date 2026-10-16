import { convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { agent, streamChat } from "@/lib/ai/orchestrator";
import { createChatTools } from "@/lib/ai/tools";
import { logUsage } from "@/lib/ai/usage";
import { auth } from "@/lib/auth";
import {
  extractTextFromParts,
  normalizeStoredParts,
} from "@/lib/chat-messages";
import { getChatResetWindow } from "@/lib/chat-usage";
import { getUserCreditBalance, spendCredits } from "@/lib/credits";
import { inngest } from "@/lib/inngest/client";
import { EVENTS, trackEvent } from "@/lib/kpi";
import {
  creditEnforcementEffective,
  getPlatformSettings,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getPrompt } from "@/lib/prompts/loader";
import { limit } from "@/lib/rate-limit";
import { computeReadiness } from "@/lib/readiness";

export const runtime = "nodejs";

/** One chat turn may not carry more than this, measured as bytes not characters. */
const MAX_REQUEST_BYTES = 64 * 1024;

/** A single part stays under this many characters, checked before trimming. */
const MAX_PART_CHARS = 8000;

/**
 * What the model is told when no note is attached to the turn. The prompt
 * declares this slot, so it has to say something honest rather than break.
 */
const NO_NOTE_CONTEXT =
  "No note is attached to this message. When the question calls for the student's own material, read it with your note tools instead of guessing.";

/**
 * Work that used to sit on the critical path. The duplicate check is a
 * diagnostic and the stats write is a counter, so neither may hold a student's
 * first token. Both run once the answer has started.
 */
async function runAfterFirstByte(input: {
  userId: string;
  conversationId: string;
  userContent: string;
}): Promise<void> {
  try {
    const recentUserMessages = await prisma.chatMessage.findMany({
      where: { conversationId: input.conversationId, role: "user" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { content: true },
    });
    const isDuplicate = recentUserMessages.some((msg) => {
      const existing = msg.content.trim().toLowerCase();
      const typed = input.userContent.trim().toLowerCase();
      return (
        existing === typed || (typed.length >= 10 && existing.includes(typed))
      );
    });
    if (isDuplicate) {
      console.warn(
        `[CHAT] Possible duplicate message in conversation ${input.conversationId}`,
      );
    }
  } catch {
    // Non-critical; never fail a turn over a diagnostic
  }

  try {
    const userStats = await prisma.userStats.findUnique({
      where: { userId: input.userId },
    });
    if (userStats) {
      await prisma.userStats.updateMany({
        where: { userId: input.userId },
        data: { totalChats: { increment: 1 } },
      });
    } else {
      await prisma.userStats.create({
        data: {
          userId: input.userId,
          totalPoints: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalChats: 1,
        },
      });
    }
  } catch (error) {
    console.error("[CHAT] Failed to record chat stats:", error);
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

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** A tool part that never produced an answer has no pair left to keep. */
function isFinishedToolPart(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const state = (part as { state?: unknown }).state;
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  );
}

function isToolPart(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const type = (part as { type?: unknown }).type;
  return typeof type === "string" && type.startsWith("tool-");
}

function cleanParts(message: UIMessage): UIMessage {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const kept = parts.filter(
    (part) => !isToolPart(part) || isFinishedToolPart(part),
  );
  return kept.length === parts.length
    ? message
    : { ...message, parts: kept as UIMessage["parts"] };
}

/**
 * Trim the thread down to what the model needs. History is dropped from the
 * oldest turn until the request fits the byte ceiling, always keeping the turn
 * the student just sent. Unfinished tool parts go, since their answer was cut
 * away with the history they belonged to.
 */
function trimForModel(messages: UIMessage[]): UIMessage[] {
  const lastUserIndex = messages.reduce(
    (found, message, index) => (message.role === "user" ? index : found),
    -1,
  );
  const from = lastUserIndex === -1 ? 0 : lastUserIndex;
  const tail = messages.slice(from).map(cleanParts);

  const kept: UIMessage[] = [];
  let bytes = 0;
  for (let index = tail.length - 1; index >= 0; index -= 1) {
    const message = tail[index];
    const size = byteLength(JSON.stringify(message));
    // The turn the student just wrote always travels, even on its own.
    if (kept.length > 0 && bytes + size > MAX_REQUEST_BYTES) break;
    kept.unshift(message);
    bytes += size;
  }
  return kept;
}

/**
 * Put a comment frame in front of the model stream, then copy it through.
 * The frame goes out the moment the headers are written, so a middlebox on a
 * congested cell never sees a silent connection during a slow prefill. SSE
 * comments are ignored by every parser, including the client's, so the frame
 * carries no meaning and costs a handful of bytes.
 */
function withKeepAlive(
  streamResponse: Response,
  startedAt: number,
  log: { userId: string; task: string },
): Response {
  const upstream = streamResponse.body;
  if (!upstream) return streamResponse;

  const encoder = new TextEncoder();
  let firstByteMs: number | null = null;
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(": keep-alive\n\n"));
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // The keep alive frame is not an answer, so the clock starts at the
          // first real chunk of stream content.
          if (firstByteMs === null) firstByteMs = Date.now() - startedAt;
          controller.enqueue(value);
        }
        // A student who closed the tab has already torn this stream down.
        if (!cancelled) controller.close();
      } catch (error) {
        console.error("[Chat] stream pump failed:", error);
        if (!cancelled) controller.error(error);
      } finally {
        reader.releaseLock();
        // Written after the stream so a student never waits on their own metrics.
        void logUsage({
          userId: log.userId,
          task: log.task,
          modelId: "stream",
          firstByteMs,
          keepAliveSent: true,
        }).catch(() => {});
      }
    },
    cancel(reason) {
      cancelled = true;
      void upstream.cancel(reason);
    },
  });

  return new Response(body, {
    status: streamResponse.status,
    headers: streamResponse.headers,
  });
}

export async function POST(req: Request) {
  try {
    const startedAt = Date.now();
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
    const rateLimitResponse = await limit("ai", nextReq);
    if (rateLimitResponse) return rateLimitResponse;

    const body = (await req.json()) as {
      messages?: UIMessage[];
      agentMode?: boolean;
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
            if (typeof text === "string" && text.length > MAX_PART_CHARS) {
              return NextResponse.json(
                {
                  error: `Message too long (max ${MAX_PART_CHARS} characters)`,
                },
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

    const { nextResetAt, windowStart } = getChatResetWindow();

    // Five independent reads in one pass. They were in sequence, which meant
    // five round trips before the student saw a first token.
    const [conversation, subscription, settings, chatsToday, levelRow] =
      await Promise.all([
        prisma.chatConversation.findFirst({
          where: { id: conversationId, userId },
          include: { _count: { select: { messages: true } } },
        }),
        prisma.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        getPlatformSettings(),
        prisma.chatMessage.count({
          where: {
            userId,
            role: "user",
            createdAt: { gte: windowStart, lt: nextResetAt },
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { levelOfStudy: true },
        }),
      ]);

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

    const plan = subscription?.plan || "FREE";
    const isPaid = plan !== "FREE" && subscription?.status === "ACTIVE";

    const enforcement = creditEnforcementEffective(settings);
    const tutorCost = settings.creditCostAiTutorMessage;

    // Define daily message limits per plan
    const dailyLimits: Record<string, number> = {
      FREE: 8,
      STARTER: -1,
      STANDARD: -1,
      PREMIUM: -1,
      PRO: -1,
    };

    const chatLimit = dailyLimits[plan] || 8;

    if (!isPaid) {
      if (chatLimit !== -1 && chatsToday >= chatLimit) {
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
    if (conversation._count.messages >= maxMessagesPerConversation) {
      return NextResponse.json(
        {
          error: `This conversation has reached the ${maxMessagesPerConversation}-message limit. Please start a new conversation to continue.`,
        },
        { status: 403 },
      );
    }

    const normalizedUserParts = normalizeStoredParts(latestUserMessage.parts);
    const userContent = extractTextFromParts(normalizedUserParts);

    // The student's turn is written before the stream starts. A closed tab
    // loses the answer, but it must not lose the question they asked.
    const userMsgRecord = await saveMessage(
      conversationId,
      userId,
      "user",
      userContent,
      normalizedUserParts,
    );

    const messageCount = conversation._count.messages;
    const conversationTitle = conversation.title;

    trackEvent(userId, EVENTS.CHAT_MESSAGE, { conversationId }).catch(() => {});

    if (messageCount === 0 && conversationTitle === "New Chat") {
      // Fire and forget. The title job is background work, and waiting on the
      // send would hold the first token hostage to a network call.
      inngest
        .send({
          name: "chat/generate-title",
          data: { conversationId, userContent, userId },
        })
        .catch((titleError) => {
          console.error("[CHAT] Failed to enqueue chat title:", titleError);
        });
    }

    let profileContext = "";

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

      profileContext = `
STUDENT PROFILE:
- Overall Readiness: ${readiness.readiness}%
${readiness.weakestTopic ? `- Weakest Topics: ${weakestThree}` : ""}
${readiness.strongestTopic ? `- Strongest Topic: ${readiness.strongestTopic.name} (${readiness.strongestTopic.score}%)` : ""}
${recommendations ? `- ${recommendations}` : ""}

Use this profile to personalize study recommendations, focus on weakest topics, and align advice with the student's current readiness level.
`;
    } catch (e) {
      console.error("Failed to compute readiness for chat context:", e);
    }

    const studentLevel = levelRow?.levelOfStudy?.trim();

    const { text: systemPrompt, settings: promptSettings } = await getPrompt(
      "chat",
      "chat_system",
      {
        userName: session.user.name,
        studentLevel:
          studentLevel ||
          "not on file yet, so start from the plain definition and offer depth when they ask",
        noteContext: NO_NOTE_CONTEXT,
        profileContext,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
      },
      { tools: true },
    );

    const modelMessages = await convertToModelMessages(trimForModel(messages));

    const tools = createChatTools({ userId: session.user.id });

    const agentMode = body.agentMode === true;

    if (agentMode) {
      // Deep reasoning path: non-streaming agent loop with chain fallback,
      // per-step logging, and tool-calling across up to maxSteps turns.
      const agentResult = await agent({
        task: "agent_reason",
        system: systemPrompt,
        tools,
        messages: modelMessages,
        maxSteps: 5,
        userId: session.user.id,
        modelOptions: {
          temperature: promptSettings.heat,
          maxOutputTokens: promptSettings.cap,
        },
      });

      const assistantContent = agentResult.text;

      await saveMessage(conversationId, userId, "assistant", assistantContent, [
        { type: "text", text: assistantContent },
      ]);

      if (enforcement.aiTutor && tutorCost > 0) {
        try {
          const balance = await getUserCreditBalance(userId);
          if (balance >= tutorCost) {
            await spendCredits({
              userId,
              amount: tutorCost,
              type: "AI_TUTOR_MESSAGE",
              description: "TiC AI tutor message (agent)",
              referenceId: userMsgRecord.id,
            });
          }
        } catch (err) {
          console.error("[CHAT] Tutor credit debit failed (agent):", err);
        }
      }

      return NextResponse.json({
        text: assistantContent,
        steps: agentResult.steps,
        modelId: agentResult.modelId,
        task: "agent_reason",
      });
    }

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
    });

    const streamResponse = result.toUIMessageStreamResponse({
      onError: (err) => {
        console.error("[Chat] stream error:", err);
        return "Failed to generate response.";
      },
      onFinish: async ({ isAborted, responseMessage }) => {
        // Runs with the stream alive, so the work lands even on serverless.
        void runAfterFirstByte({
          userId,
          conversationId,
          userContent,
        }).catch(() => {});

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
                  description: "TiC AI tutor message",
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

    return withKeepAlive(streamResponse, startedAt, {
      userId,
      task: "fast_chat",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
