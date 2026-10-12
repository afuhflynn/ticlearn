import { tavily } from "@tavily/core";
import { tool } from "ai";
import { z } from "zod";
import {
  CREATE_QUIZ_TOOL_POLICIES,
  createToolPolicyContext,
  DEFAULT_CHAT_TOOL_POLICIES,
  WEB_SEARCH_TOOL_POLICIES,
  wrapTool,
} from "@/lib/ai/tool-policy";
import {
  getEffectiveCreditCost,
  getUserCreditBalance,
  spendCredits,
} from "@/lib/credits";
import {
  getPlatformSettings,
  quizCreditsRequired,
} from "@/lib/platform-settings";
import { prisma } from "@/lib/prisma";
import { getToolDescription } from "@/lib/prompts/loader";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

type SearchDepth = "basic" | "advanced";

type ToolFactoryOptions = {
  userId: string;
};

type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

const notePreviewSelect = {
  id: true,
  title: true,
  subject: true,
  fileName: true,
  fileType: true,
  status: true,
  summary: true,
  topics: true,
  keyPoints: true,
  updatedAt: true,
} as const;

const quizPreviewSelect = {
  id: true,
  title: true,
  noteId: true,
  noteTitle: true,
  questionCount: true,
  status: true,
  isPublic: true,
  timed: true,
  timeLimit: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function searchWithTavily(
  query: string,
  options: {
    searchDepth?: SearchDepth;
    maxResults?: number;
  } = {},
): Promise<TavilySearchResult[]> {
  if (!TAVILY_API_KEY) {
    throw new Error(
      "Web search is unavailable because TAVILY_API_KEY is not set.",
    );
  }

  const client = tavily({ apiKey: TAVILY_API_KEY });
  const response = await client.search(query, {
    searchDepth: options.searchDepth ?? "advanced",
    includeAnswer: true,
    maxResults: options.maxResults ?? 5,
  });

  return (response.results ?? []).map((result) => ({
    title: result.title ?? "",
    url: result.url ?? "",
    content: result.content ?? "",
    score: result.score ?? 0,
  }));
}

function truncateResults(
  results: TavilySearchResult[],
  maxChars = 2000,
): TavilySearchResult[] {
  return results.map((r) => ({
    ...r,
    content: r.content.slice(0, maxChars),
  }));
}

export function createChatTools({ userId }: ToolFactoryOptions) {
  const policyContext = createToolPolicyContext(userId);

  const webSearchTool = tool({
    description: getToolDescription("web_search"),
    inputSchema: z.object({
      query: z.string().min(3).describe("The web search query."),
      searchDepth: z
        .enum(["basic", "advanced"])
        .default("basic")
        .describe("Whether to do a faster basic search or a deeper search."),
    }),
    execute: async ({ query, searchDepth }) => {
      const results = await searchWithTavily(query, {
        searchDepth,
        maxResults: 5,
      });
      return {
        query,
        results: truncateResults(results),
      };
    },
  });

  const getUserNotesTool = tool({
    description: getToolDescription("get_user_notes"),
    inputSchema: z.object({
      limit: z.number().int().min(1).max(20).default(10),
      status: z
        .enum(["UPLOADING", "PROCESSING", "READY", "ERROR"])
        .optional()
        .describe("Optionally filter notes by processing status."),
    }),
    execute: async ({ limit, status }) => {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: notePreviewSelect,
      });

      return { notes };
    },
  });

  const searchNotesTool = tool({
    description: getToolDescription("search_notes"),
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .describe("The text to search for inside the user's notes."),
      limit: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ query, limit }) => {
      const notes = await prisma.note.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { extractedText: { contains: query, mode: "insensitive" } },
            { topics: { has: query } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: notePreviewSelect,
      });

      return { notes };
    },
  });

  const getNoteContextTool = tool({
    description: getToolDescription("get_note_context"),
    inputSchema: z.object({
      noteId: z.string().min(1).describe("The note ID."),
    }),
    execute: async ({ noteId }) => {
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
        include: {
          quizzes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              ...quizPreviewSelect,
              attempts: {
                where: { userId },
                orderBy: { completedAt: "desc" },
                take: 3,
                select: {
                  id: true,
                  score: true,
                  correctAnswers: true,
                  totalQuestions: true,
                  completedAt: true,
                },
              },
            },
          },
        },
      });

      if (!note) {
        throw new Error("Note not found.");
      }

      return {
        note: {
          id: note.id,
          title: note.title,
          subject: note.subject,
          fileName: note.fileName,
          fileType: note.fileType,
          fileUrl: note.fileUrl,
          status: note.status,
          summary: note.summary,
          topics: note.topics,
          keyPoints: note.keyPoints,
          quizzes: note.quizzes,
        },
      };
    },
  });

  const getUserQuizzesTool = tool({
    description: getToolDescription("get_user_quizzes"),
    inputSchema: z.object({
      scope: z.enum(["all", "my", "public"]).default("my"),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    execute: async ({ scope, limit }) => {
      const where =
        scope === "public"
          ? { isPublic: true, status: "READY" as const }
          : scope === "all"
            ? {
                OR: [{ userId }, { isPublic: true, status: "READY" as const }],
              }
            : { userId };

      const quizzes = await prisma.quiz.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          ...quizPreviewSelect,
          note: {
            select: {
              id: true,
              title: true,
              subject: true,
            },
          },
          _count: {
            select: { attempts: true },
          },
        },
      });

      return {
        quizzes: quizzes.map((quiz) => ({
          ...quiz,
          attemptCount: quiz._count.attempts,
        })),
      };
    },
  });

  const getQuizContextTool = tool({
    description: getToolDescription("get_quiz_context"),
    inputSchema: z.object({
      quizId: z.string().min(1).describe("The quiz ID."),
    }),
    execute: async ({ quizId }) => {
      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          OR: [{ userId }, { isPublic: true, status: "READY" }],
        },
        include: {
          note: {
            select: {
              id: true,
              title: true,
              subject: true,
              summary: true,
              topics: true,
              keyPoints: true,
            },
          },
          questions: {
            orderBy: { order: "asc" },
          },
          attempts: {
            where: { userId },
            orderBy: { completedAt: "desc" },
            take: 10,
            include: {
              answers: true,
            },
          },
        },
      });

      if (!quiz) {
        throw new Error("Quiz not found.");
      }

      return { quiz };
    },
  });

  const getQuizAttemptHistoryTool = tool({
    description: getToolDescription("get_quiz_attempt_history"),
    inputSchema: z.object({
      quizId: z.string().optional().describe("Optional quiz ID filter."),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    execute: async ({ quizId, limit }) => {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          userId,
          ...(quizId ? { quizId } : {}),
        },
        orderBy: { completedAt: "desc" },
        take: limit,
        include: {
          answers: {
            take: 10,
          },
        },
      });

      return { attempts };
    },
  });

  const getStudyProgressTool = tool({
    description: getToolDescription("get_study_progress"),
    inputSchema: z.object({}),
    execute: async () => {
      const [userStats, noteCount, quizCount, attemptCount, avgScore] =
        await Promise.all([
          prisma.userStats.findFirst({
            where: { userId },
          }),
          prisma.note.count({ where: { userId } }),
          prisma.quiz.count({ where: { userId } }),
          prisma.quizAttempt.count({ where: { userId } }),
          prisma.quizAttempt.aggregate({
            where: { userId },
            _avg: { score: true },
          }),
        ]);

      return {
        progress: {
          totalPoints: userStats?.totalPoints ?? 0,
          currentStreak: userStats?.currentStreak ?? 0,
          longestStreak: userStats?.longestStreak ?? 0,
          lastActivityDate: userStats?.lastActivityDate ?? null,
          quizzesTaken: userStats?.quizzesTaken ?? 0,
          totalChats: userStats?.totalChats ?? 0,
          avgScore: avgScore._avg.score ?? 0,
          totalNotes: noteCount,
          totalQuizzes: quizCount,
          totalAttempts: attemptCount,
        },
      };
    },
  });

  const getSubscriptionContextTool = tool({
    description: getToolDescription("get_subscription_context"),
    inputSchema: z.object({}),
    execute: async () => {
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return {
        subscription: subscription ?? {
          plan: "FREE",
          status: "PENDING",
        },
      };
    },
  });

  const createQuizTool = tool({
    description: getToolDescription("create_quiz"),
    inputSchema: z.object({
      title: z.string().min(3).max(120).describe("Quiz title."),
      noteId: z
        .string()
        .optional()
        .describe(
          "ID of the user's note to link this quiz to. Omit for a standalone topic quiz.",
        ),
      noteTitle: z
        .string()
        .max(120)
        .default("General")
        .describe(
          "Human-readable note/topic title shown on the quiz card. Use the note title if noteId is provided, otherwise a short topic label.",
        ),
      timed: z.boolean().default(false).describe("Whether the quiz is timed."),
      timeLimit: z
        .number()
        .int()
        .min(60)
        .max(7200)
        .optional()
        .describe("Time limit in seconds. Required when timed is true."),
      questions: z
        .array(
          z.object({
            type: z
              .enum(["MCQ", "OPEN"])
              .describe("MCQ = multiple choice, OPEN = free-response."),
            question: z.string().min(5).describe("The question text."),
            options: z
              .array(z.string())
              .min(2)
              .max(6)
              .describe(
                "Answer choices. Required for MCQ; for OPEN, pass an empty array [].",
              ),
            correctAnswer: z
              .string()
              .describe(
                "For MCQ: the exact string of the correct option. For OPEN: a model answer or key points.",
              ),
            explanation: z
              .string()
              .optional()
              .describe("Optional explanation shown after the user answers."),
          }),
        )
        .min(1)
        .max(50)
        .describe("Full list of quiz questions to create."),
    }),
    execute: async ({
      title,
      noteId,
      noteTitle,
      timed,
      timeLimit,
      questions,
    }) => {
      if (noteId) {
        const note = await prisma.note.findFirst({
          where: { id: noteId, userId },
          select: { id: true },
        });
        if (!note) {
          throw new Error(
            "Note not found or does not belong to the current user.",
          );
        }
      }

      if (timed && !timeLimit) {
        throw new Error("timeLimit is required when timed is true.");
      }

      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      const plan =
        subscription?.status === "ACTIVE" ? subscription.plan : "FREE";

      const quizLimits: Record<string, number> = {
        FREE: 4,
        STARTER: 20,
        STANDARD: 60,
        PREMIUM: -1,
        PRO: -1,
      };
      const quizLimit = quizLimits[plan] ?? quizLimits.FREE;
      const quizCount = await prisma.quiz.count({ where: { userId } });
      if (quizLimit !== -1 && quizCount >= quizLimit) {
        throw new Error(
          `Quiz generation limit reached (${quizLimit}). Upgrade your plan to generate more quizzes.`,
        );
      }

      const settings = await getPlatformSettings();
      const wantsDebit = quizCreditsRequired(settings);
      const planValue = plan === "FREE" ? null : plan;
      const quizCost = getEffectiveCreditCost(
        settings.creditCostQuizGeneration,
        planValue,
        settings,
      );

      if (wantsDebit) {
        const balance = await getUserCreditBalance(userId);
        if (balance < quizCost) {
          throw new Error(
            `Insufficient credits. Need ${quizCost} credits to generate a quiz.`,
          );
        }
      }

      const quiz = await prisma.$transaction(async (tx) => {
        const created = await tx.quiz.create({
          data: {
            userId,
            noteId: noteId || null,
            noteTitle,
            title,
            questionCount: questions.length,
            status: "READY",
            isPublic: false,
            timed,
            timeLimit: timed ? timeLimit : null,
          },
        });

        await tx.quizQuestion.createMany({
          data: questions.map((q, i) => ({
            quizId: created.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? null,
            order: i + 1,
          })),
        });

        return created;
      });

      if (wantsDebit) {
        try {
          await spendCredits({
            userId,
            amount: quizCost,
            type: "QUIZ_GENERATION",
            description: `Quiz from AI tool: ${title}`,
            referenceId: quiz.id,
          });
        } catch (err) {
          console.error("[createQuiz] Credit debit failed:", err);
        }
      }

      return {
        quizId: quiz.id,
        title: quiz.title,
        questionCount: quiz.questionCount,
        isPublic: quiz.isPublic,
        timed: quiz.timed,
        timeLimit: quiz.timeLimit,
        noteId: noteId ?? null,
        noteTitle,
        status: quiz.status,
      };
    },
  });

  return {
    webSearch: wrapTool(webSearchTool, WEB_SEARCH_TOOL_POLICIES, policyContext),
    getUserNotes: wrapTool(
      getUserNotesTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    searchNotes: wrapTool(
      searchNotesTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getNoteContext: wrapTool(
      getNoteContextTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getUserQuizzes: wrapTool(
      getUserQuizzesTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getQuizContext: wrapTool(
      getQuizContextTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getQuizAttemptHistory: wrapTool(
      getQuizAttemptHistoryTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getStudyProgress: wrapTool(
      getStudyProgressTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    getSubscriptionContext: wrapTool(
      getSubscriptionContextTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    createQuiz: wrapTool(
      createQuizTool,
      CREATE_QUIZ_TOOL_POLICIES,
      policyContext,
    ),
  };
}
