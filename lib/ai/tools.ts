import { tool } from "ai";
import { z } from "zod";
import {
  CREATE_QUIZ_TOOL_POLICIES,
  createToolPolicyContext,
  DEFAULT_CHAT_TOOL_POLICIES,
  READ_PAGE_TOOL_POLICIES,
  WEB_SEARCH_TOOL_POLICIES,
  wrapTool,
} from "@/lib/ai/tool-policy";
import { sanitizeSuggestions } from "@/lib/ai/validators";
import {
  getEffectiveCreditCost,
  getUserCreditBalance,
  spendCredits,
} from "@/lib/credits";
import { getPlanLimits, limitReached, resolvePlan } from "@/lib/plan-limits";
import {
  getPlatformSettings,
  quizCreditsRequired,
} from "@/lib/platform-settings";
import { inngest } from "@/lib/inngest/client";
import { getGroundedPageInputs } from "@/lib/grounded-pages";
import { prisma } from "@/lib/prisma";
import { getToolDescription } from "@/lib/prompts/loader";
import { runReadPage, runWebSearch } from "@/lib/web-search";
import {
  PER_REQUEST_CAPS,
  SEARCH_DEPTHS,
  SEARCH_RECENCIES,
} from "@/lib/web-search/types";

type ToolFactoryOptions = {
  userId: string;
  conversationId?: string;
};

const notePreviewSelect = {
  id: true,
  title: true,
  fileName: true,
  fileType: true,
  status: true,
  summary: true,
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

export function createChatTools({
  userId,
  conversationId,
}: ToolFactoryOptions) {
  const policyContext = createToolPolicyContext(userId);

  // Per request, not per conversation. A five step agent turn must not multiply
  // the search budget, so the refusal is a plain result, never an error.
  let webSearchCalls = 0;
  let readPageCalls = 0;

  const webSearchTool = tool({
    description: getToolDescription("web_search"),
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .max(500)
        .describe("What to search for, written as a search query."),
      depth: z
        .enum(SEARCH_DEPTHS)
        .default("quick")
        .describe(
          "quick reads snippets only. thorough also reads the pages, and is slower and rarer.",
        ),
      recency: z
        .enum(SEARCH_RECENCIES)
        .default("any")
        .describe(
          "How recent the results should be. any applies no time filter.",
        ),
      country: z
        .string()
        .regex(/^[A-Za-z]{2}$/)
        .default("CM")
        .describe("Two letter country code the results should come from."),
    }),
    execute: async ({ query, depth, recency, country }) => {
      if (webSearchCalls >= PER_REQUEST_CAPS.webSearch) {
        return { ok: false, degraded: true, results: [] };
      }
      webSearchCalls += 1;

      return runWebSearch({ query, depth, recency, country }, { userId });
    },
  });

  const readPageTool = tool({
    description: getToolDescription("read_page"),
    inputSchema: z.object({
      url: z
        .string()
        .min(1)
        .max(2_048)
        .describe("The full page address, starting with http or https."),
    }),
    execute: async ({ url }) => {
      if (readPageCalls >= PER_REQUEST_CAPS.readPage) {
        return {
          ok: false,
          title: null,
          body: null,
          truncated: false,
          warnings: [],
          reason:
            "This answer has already opened as many pages as it can. I will work with what it has.",
        };
      }
      readPageCalls += 1;

      return runReadPage(url, { userId });
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
            { summary: { contains: query, mode: "insensitive" } },
            { extractedText: { contains: query, mode: "insensitive" } },
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
      noteTitle: z
        .string()
        .max(120)
        .optional()
        .describe(
          "The note title, when it is already known. It names the note for the student while the tool runs.",
        ),
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
          fileName: note.fileName,
          fileType: note.fileType,
          fileUrl: note.fileUrl,
          status: note.status,
          summary: note.summary,
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
              summary: true,
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
          "ID of the user's note this quiz comes from. Omit it when the student has no note in play and the quiz is built from the topic they named.",
        ),
      noteTitle: z
        .string()
        .max(120)
        .optional()
        .describe(
          "Note title shown on the quiz card. Omit it when there is no note; the quiz title is used instead.",
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
      // A quiz no longer needs a note. When the student has none in play the
      // note stays null and the topic they named becomes the card title.
      let note: { id: string } | null = null;
      if (noteId) {
        note = await prisma.note.findFirst({
          where: { id: noteId, userId },
          select: { id: true },
        });
        if (!note) {
          throw new Error(
            "Note not found or does not belong to the current user.",
          );
        }
      }
      const resolvedNoteTitle = noteTitle?.trim() || title;
      const resolvedNoteId = note?.id ?? null;

      if (timed && !timeLimit) {
        throw new Error("timeLimit is required when timed is true.");
      }

      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      const plan = resolvePlan(subscription);

      const quizLimit = getPlanLimits(plan).quizGenerations;
      const quizCount = await prisma.quiz.count({ where: { userId } });
      if (limitReached(quizLimit, quizCount)) {
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
            noteId: resolvedNoteId,
            noteTitle: resolvedNoteTitle,
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
        // The ready-made destination goes with the result, so the model links
        // to the real page instead of improvising one.
        url: `/quizzes/${quiz.id}`,
        title: quiz.title,
        questionCount: quiz.questionCount,
        isPublic: quiz.isPublic,
        timed: quiz.timed,
        timeLimit: quiz.timeLimit,
        noteId: resolvedNoteId,
        noteTitle: resolvedNoteTitle,
        status: quiz.status,
      };
    },
  });

  const getNotePagesTool = tool({
    description: getToolDescription("get_note_pages"),
    inputSchema: z.object({
      noteId: z
        .string()
        .optional()
        .describe(
          "The note id from a search result already in context. Omit it to use the conversation note.",
        ),
    }),
    execute: async (
      { noteId: hintedNoteId },
      options?: { toolCallId?: string },
    ) => {
      let noteId = hintedNoteId ?? null;
      if (!noteId) {
        if (!conversationId) {
          throw new Error(
            "This conversation has no note attached. Answer from the typed question instead.",
          );
        }

        const conversation = await prisma.chatConversation.findFirst({
          where: { id: conversationId, userId },
          select: { noteId: true },
        });
        noteId = conversation?.noteId ?? null;
        if (!noteId) {
          throw new Error(
            "This conversation has no note attached. Answer from the typed question instead.",
          );
        }
      }

      const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
        select: { id: true, title: true, fileType: true, status: true },
      });
      if (!note) {
        throw new Error("Note not found.");
      }

      const inputs = await getGroundedPageInputs(note.id);
      if (inputs.length === 0) {
        const [pageCount, pendingCount, analysisCount] = await Promise.all([
          prisma.page.count({ where: { noteId: note.id } }),
          prisma.visualAnalysis.count({
            where: {
              page: { noteId: note.id },
              status: { in: ["PENDING"] },
            },
          }),
          prisma.visualAnalysis.count({
            where: { page: { noteId: note.id } },
          }),
        ]);
        // Self heal for notes the scan pipeline never touched: PDFs uploaded
        // before the pipeline existed, seeded notes, or uploads sent while
        // Inngest was down leave zero page rows behind. The job skips
        // analysed pages, so re emitting is safe; PROCESSING notes are left
        // alone because their upload event may still be in flight. A failed
        // queue send never breaks the chat turn, the pending shape below
        // already tells the model not to guess.
        if (
          note.fileType === "PDF" &&
          pageCount === 0 &&
          analysisCount === 0 &&
          (note.status === "READY" || note.status === "ERROR")
        ) {
          try {
            await inngest.send({
              name: "note/uploaded",
              data: { noteId: note.id },
            });
          } catch (error) {
            console.warn(
              "[getNotePages] Page scan requeue failed:",
              error instanceof Error ? error.message : String(error),
            );
          }
        }
        return {
          pages: [],
          scanPending: pageCount === 0 || pendingCount > 0,
          noteTitle: note.title,
        };
      }

      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      const plan = resolvePlan(subscription);
      const settings = await getPlatformSettings();
      const planValue = plan === "FREE" ? null : plan;
      const lookupCost = getEffectiveCreditCost(
        settings.creditCostPageLookup,
        planValue,
        settings,
      );

      // No balance pre-check here: spendCredits enforces the balance itself
      // and answers an already debited call id without charging again, so a
      // retry always reaches that idempotent path.
      if (lookupCost > 0) {
        const toolCallId =
          typeof options?.toolCallId === "string"
            ? options.toolCallId
            : undefined;
        try {
          await spendCredits({
            userId,
            amount: lookupCost,
            type: "PAGE_LOOKUP",
            description: `Page lookup in note: ${note.title}`,
            referenceId: toolCallId ? `pagelookup:${toolCallId}` : undefined,
          });
        } catch (err) {
          console.error("[getNotePages] Credit debit failed:", err);
          throw err;
        }
      }

      return {
        pages: inputs.map((page) => ({
          pageNumber: page.pageNumber,
          visualType: page.visualType,
          description: page.description,
          confidence: page.confidence,
        })),
        scanPending: false,
        noteTitle: note.title,
      };
    },
  });

  const suggestRepliesTool = tool({
    description: getToolDescription("suggest_replies"),
    inputSchema: z.object({
      questions: z
        .array(z.string())
        .describe(
          "Two or three short questions the student could ask next, written in their own voice.",
        ),
    }),
    execute: async ({ questions }) => {
      // The model's shape is a proposal, not a contract. The sanitizer keeps
      // two or three safe questions and turns an unusable set into none.
      return { questions: sanitizeSuggestions(questions) };
    },
  });

  const drawVisualTool = tool({
    description: getToolDescription("draw_visual"),
    inputSchema: z.object({
      concept: z
        .string()
        .min(1)
        .max(160)
        .describe("The idea to draw, in plain words."),
      noteId: z
        .string()
        .optional()
        .describe("The note in play, when there is one."),
    }),
    execute: async ({ concept, noteId }) => {
      // Server validated: ownership resolves through the caller id, the cap
      // runs before the model call, invalid output degrades to text.
      const { generateVisualArtifact } = await import("@/lib/visual-artifacts");
      const clean = concept.trim().slice(0, 160);
      let context = "";
      let resolvedNoteId: string | null = null;
      // The model may omit the note; fall back to the conversation's note
      // so drawings stay grounded and linked, exactly like getNotePages.
      let effectiveNoteId = noteId ?? null;
      if (!effectiveNoteId && conversationId) {
        const conversation = await prisma.chatConversation.findFirst({
          where: { id: conversationId, userId },
          select: { noteId: true },
        });
        effectiveNoteId = conversation?.noteId ?? null;
      }
      if (effectiveNoteId) {
        const note = await prisma.note.findFirst({
          where: { id: effectiveNoteId, userId },
          select: { id: true, summary: true, keyPoints: true },
        });
        if (!note) return { ok: false, reason: "missing" };
        resolvedNoteId = note.id;
        context = [note.summary ?? "", (note.keyPoints ?? []).join("\n")]
          .join("\n")
          .slice(0, 4000);
      }
      const result = await generateVisualArtifact({
        userId,
        noteId: resolvedNoteId,
        concept: clean,
        context,
      });
      if (!result.ok) return result;
      return { ...result, noteId: resolvedNoteId, concept: clean };
    },
  });

  const startQuizTool = tool({
    description: getToolDescription("start_quiz"),
    inputSchema: z.object({
      noteId: z
        .string()
        .optional()
        .describe("The note to quiz on. Omit it when no note is in play."),
      noteTitle: z
        .string()
        .max(120)
        .optional()
        .describe("Note title shown on the runner card. Omit it with noteId."),
    }),
    execute: async ({ noteId, noteTitle }) => {
      // Mounting the runner costs nothing; generation and grading debit
      // downstream through the same endpoints and caps as the quiz page.
      let resolvedNoteId: string | null = noteId ?? null;
      let resolvedNoteTitle: string | null = noteTitle?.trim() || null;
      if (!resolvedNoteId && conversationId) {
        const conversation = await prisma.chatConversation.findFirst({
          where: { id: conversationId, userId },
          select: { noteId: true },
        });
        resolvedNoteId = conversation?.noteId ?? null;
      }
      if (resolvedNoteId) {
        const note = await prisma.note.findFirst({
          where: { id: resolvedNoteId, userId },
          select: { id: true, title: true },
        });
        if (!note) return { ok: false as const, reason: "missing" as const };
        resolvedNoteId = note.id;
        resolvedNoteTitle = resolvedNoteTitle ?? note.title;
      }
      return {
        ok: true as const,
        noteId: resolvedNoteId,
        noteTitle: resolvedNoteTitle,
      };
    },
  });

  return {
    webSearch: wrapTool(webSearchTool, WEB_SEARCH_TOOL_POLICIES, policyContext),
    readPage: wrapTool(readPageTool, READ_PAGE_TOOL_POLICIES, policyContext),
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
    getNotePages: wrapTool(
      getNotePagesTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    // No policy applies: the tool touches no user data, only the model's own
    // two or three sentences, which the sanitizer caps.
    suggestReplies: wrapTool(suggestRepliesTool, [], policyContext),
    drawVisual: wrapTool(
      drawVisualTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
    startQuiz: wrapTool(
      startQuizTool,
      DEFAULT_CHAT_TOOL_POLICIES,
      policyContext,
    ),
  };
}
