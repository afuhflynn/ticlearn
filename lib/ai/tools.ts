import { tavily } from "@tavily/core";
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

export function createChatTools({ userId }: ToolFactoryOptions) {
  return {
    webSearch: tool({
      description:
        "Search the web for current information, recent changes, or live facts that are not safely answerable from stored user data.",
      inputSchema: z.object({
        query: z.string().min(3).describe("The web search query."),
        searchDepth: z
          .enum(["basic", "advanced"])
          .default("basic")
          .describe("Whether to do a faster basic search or a deeper search."),
      }),
      execute: async ({ query, searchDepth }) => {
        return {
          query,
          results: await searchWithTavily(query, {
            searchDepth,
            maxResults: 5,
          }),
        };
      },
    }),

    getUserNotes: tool({
      description:
        "Get the authenTiCted user's uploaded notes, including processing state and study insights previews.",
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
    }),

    searchNotes: tool({
      description:
        "Search the authenTiCted user's notes by title, subject, extracted text, or summary.",
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
    }),

    getNoteContext: tool({
      description:
        "Get the full context of one user note, including extracted text, summary, topics, key points, and related quizzes.",
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
            extractedText: note.extractedText,
            quizzes: note.quizzes,
          },
        };
      },
    }),

    getUserQuizzes: tool({
      description:
        "Get the authenTiCted user's quizzes, including visibility and generation state.",
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
                  OR: [
                    { userId },
                    { isPublic: true, status: "READY" as const },
                  ],
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
    }),

    getQuizContext: tool({
      description:
        "Get the full context of a quiz the user owns or can access publicly, including questions and the user's recent attempts.",
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
    }),

    getQuizAttemptHistory: tool({
      description:
        "Get the authenTiCted user's recent quiz attempts, optionally filtered to one quiz.",
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
    }),

    getStudyProgress: tool({
      description:
        "Get the authenTiCted user's study stats, streak, points, counts, and recent averages.",
      inputSchema: z.object({}),
      execute: async () => {
        const [userStats, noteCount, quizCount, attemptCount, avgScore] =
          await Promise.all([
            prisma.userStats.findUnique({
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
    }),

    getSubscriptionContext: tool({
      description:
        "Get the authenTiCted user's current subscription or plan status so the assistant can explain limits and feature access correctly.",
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
    }),
    createQuiz: tool({
      description:
        "Create a quiz for the authenticated user. Can be linked to one of their notes (noteId) or standalone with no note link. Generates the full quiz with all questions in one shot. Use this when the user asks to generate, create, or make a quiz — either from a specific note or on a topic from the conversation.",
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
        isPublic: z
          .boolean()
          .default(false)
          .describe("Make the quiz publicly visible to other users."),
        timed: z
          .boolean()
          .default(false)
          .describe("Whether the quiz is timed."),
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
        isPublic,
        timed,
        timeLimit,
        questions,
      }) => {
        // If a noteId is provided, verify the user owns it
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

        const quiz = await prisma.$transaction(async (tx) => {
          const created = await tx.quiz.create({
            data: {
              userId,
              noteId: noteId ?? "__standalone__", // use a sentinel or adjust schema to make noteId optional
              noteTitle,
              title,
              questionCount: questions.length,
              status: "READY",
              isPublic,
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
    }),

    searchKnowledge: tool({
      description:
        "Search the platform-wide knowledge base for explanations, summaries, and examples on any topic. Includes knowledge extracted from all users' notes and official exam questions.",
      inputSchema: z.object({
        query: z.string().min(2).describe("The topic or concept to search for"),
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ query, limit }) => {
        const chunks = await prisma.knowledgeChunk.findMany({
          where: {
            topic: { name: { contains: query, mode: "insensitive" } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            title: true,
            content: true,
            contentType: true,
            sourceType: true,
          },
        });

        return { results: chunks };
      },
    }),
  };
}
