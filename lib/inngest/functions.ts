import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromWord,
  summarizeText,
} from "@/lib/ai";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { attachTopicsToNote } from "@/lib/topics";

export const processNote = inngest.createFunction(
  {
    name: "Process Note",
    id: "process-note",
    triggers: {
      event: "note/process",
    },
    concurrency: {
      limit: 4,
      key: "note-processing",
    },
  },

  async ({ event, step }) => {
    const { noteId } = event.data;
    console.log(`Processing note: ${noteId}`);

    try {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        console.error(`Note not found: ${noteId}`);
        return { success: false, error: "Note not found" };
      }

      // Every run of the job overwrites the stage, so a note that is processed
      // again starts from the first stage and not from where it stopped last
      // time.
      await prisma.note.update({
        where: { id: noteId },
        data: { status: "PROCESSING", processingStage: "EXTRACTING" },
      });

      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: note.userId },
      });
      const language = userSettings?.language ?? "eng";
      console.log(`[Inngest] Using language for OCR: ${language}`);

      console.log(
        `[Inngest] Note fileType: ${note.fileType}, fileUrl: ${note.fileUrl}`,
      );

      const timeoutMs = 120000; // 2 minutes
      let extractedText: string;

      const extractWithTimeout = async (
        extractionFn: () => Promise<string>,
        timeout: number,
      ): Promise<string> => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(`OCR timed out after ${timeout / 1000} seconds`),
              ),
            timeout,
          );
        });
        return Promise.race([extractionFn(), timeoutPromise]);
      };

      console.log(
        `[Inngest] Starting extraction for fileType: ${note.fileType}, uploadthingKey: ${note.uploadthingKey ? `${note.uploadthingKey.substring(0, 30)}...` : "MISSING"}`,
      );

      switch (note.fileType) {
        case "PDF":
          console.log("[Inngest] Extracting PDF text...");
          if (!note.uploadthingKey) {
            throw new Error("Cannot process PDF: uploadthingKey is missing");
          }
          extractedText = await extractWithTimeout(
            () => extractTextFromPDF(note.uploadthingKey!, language),
            timeoutMs,
          );
          break;
        case "IMAGE":
          console.log("[Inngest] Extracting IMAGE text...");
          extractedText = await extractWithTimeout(
            () =>
              extractTextFromImage(
                note.uploadthingKey || undefined,
                note.fileUrl,
                language,
              ),
            timeoutMs,
          );
          break;
        case "WORD":
          console.log("[Inngest] Extracting WORD text...");
          extractedText = await extractTextFromWord(
            note.uploadthingKey || undefined,
            note.fileUrl,
          );
          break;
        default:
          throw new Error(`Unsupported file type: ${note.fileType}`);
      }

      console.log(
        `[Inngest] Extraction result length: ${extractedText?.length || 0}`,
      );

      if (!extractedText || extractedText.length < 100) {
        throw new Error(
          `Text extraction returned too little content (got ${extractedText?.length || 0} chars)`,
        );
      }

      console.log("[Inngest] Generating summary...");
      await prisma.note.update({
        where: { id: noteId },
        data: { processingStage: "SUMMARIZING" },
      });
      // A summary failure must never strand the note in ERROR. The quiz reads
      // extractedText, not the brief, so degrade to a slice of the text and
      // keep the note moving toward READY.
      let summaryResult: {
        summary: string;
        topics: string[];
        keyPoints: string[];
      };
      try {
        summaryResult = await summarizeText(extractedText, note.userId);
      } catch (summaryError) {
        console.warn(
          "[Inngest] Summary failed, degrading to text slice:",
          summaryError instanceof Error ? summaryError.message : summaryError,
        );
        summaryResult = {
          summary: extractedText.slice(0, 500),
          topics: [],
          keyPoints: [],
        };
      }

      console.log("[Inngest] Attaching topics to the note...");
      await prisma.note.update({
        where: { id: noteId },
        data: { processingStage: "INDEXING" },
      });
      try {
        await attachTopicsToNote(noteId, summaryResult.topics);
      } catch (topicsError) {
        console.warn(
          "[Inngest] Topic attach failed, continuing without topics:",
          topicsError instanceof Error ? topicsError.message : topicsError,
        );
      }

      console.log("[Inngest] Updating note in database...");
      await prisma.note.update({
        where: { id: noteId },
        data: {
          extractedText,
          summary: summaryResult.summary,
          keyPoints: summaryResult.keyPoints,
          status: "READY",
          processingStage: null,
        },
      });

      console.log(`Note processed successfully: ${noteId}`);

      return { success: true, noteId };
    } catch (error) {
      console.error("Note processing error:", error);
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Unknown error",
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack",
      );

      await prisma.note.update({
        where: { id: noteId },
        data: { status: "ERROR" },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      };
    }
  },
);

export const generateQuiz = inngest.createFunction(
  {
    name: "Generate Quiz",
    id: "generate-quiz",
    triggers: {
      event: "quiz/generate",
    },
    // A transient model outage must not strand a quiz in ERROR: throwing lets
    // the job retry with backoff, and a retry that succeeds overwrites ERROR
    // with READY. The credit debit is keyed on quizId, so retries never
    // double-charge.
    retries: 3,
  },
  async ({ event, step }) => {
    const {
      noteId,
      quizId,
      questionCount,
      questionTypes,
      wantsDebit,
      quizCost,
      userId,
      noteTitle,
      grounded,
    } = event.data as {
      noteId: string;
      quizId: string;
      questionCount: number;
      questionTypes: "MCQ" | "OPEN" | "MIXED";
      wantsDebit: boolean;
      quizCost: number;
      userId: string;
      noteTitle: string;
      grounded?: boolean;
    };
    console.log(
      `[Inngest] Generating quiz for note: ${noteId}, quiz: ${quizId}`,
    );
    console.log(
      `[Inngest] Options: ${questionCount} questions, type: ${questionTypes}`,
    );

    try {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note || !note.extractedText) {
        console.error(
          `[Inngest] Note not found or no extracted text for noteId: ${noteId}`,
        );
        throw new Error("Note or extracted text not found");
      }

      console.log(
        `[Inngest] Note extracted text length: ${note.extractedText.length} chars`,
      );

      const { generateQuizFromNote, QUIZ_BATCH_SIZE } = await import(
        "@/lib/ai"
      );
      const { formatPageContext, getGroundedPageInputs } = await import(
        "@/lib/grounded-pages"
      );
      console.log(`[Inngest] Calling AI to generate quiz...`);

      const totalQuestions = questionCount || 10;
      const resolvedTypes = questionTypes || "MIXED";
      const isGrounded = grounded === true;
      let pageContext = "No analyzed pages for this note.";
      if (isGrounded) {
        try {
          const inputs = await getGroundedPageInputs(noteId);
          pageContext = formatPageContext(inputs);
        } catch (pageError) {
          console.warn(
            "[Inngest] Grounded page read failed, degrading to text only:",
            pageError,
          );
        }
      }
      // One model call cannot reliably emit a 50-100 question quiz: the
      // output cap truncates mid-JSON (schema fail-fast kills the walk) and
      // providers reject very large max_tokens outright. Batches of 15 stay
      // inside both limits, and each batch runs as its own step so a long
      // quiz never hits a single invocation's timeout. The batchLabel keeps
      // each batch's prompt (and cache key) distinct.
      const batchCount = Math.ceil(totalQuestions / QUIZ_BATCH_SIZE);
      const extractedText: string = note.extractedText;
      type BatchQuestions = Awaited<
        ReturnType<typeof generateQuizFromNote>
      >["questions"];
      let generatedQuestions: BatchQuestions = [];
      let fromCache = true;
      for (let batch = 0; batch < batchCount; batch += 1) {
        const batchSize = Math.min(
          QUIZ_BATCH_SIZE,
          totalQuestions - batch * QUIZ_BATCH_SIZE,
        );
        const batchLabel =
          batchCount > 1
            ? `Part ${batch + 1} of ${batchCount}: write ${batchSize} questions that are distinct from the other parts of this quiz (do not repeat questions across parts).`
            : undefined;
        const produced = await step.run(
          `generate-batch-${batch + 1}`,
          async () => {
            const result = await generateQuizFromNote(
              extractedText,
              {
                questionCount: batchSize,
                questionTypes: resolvedTypes,
                batchLabel,
                grounded: isGrounded,
                pageContext: isGrounded ? pageContext : undefined,
              },
              note.userId,
            );
            if (result.questions.length === 0) {
              throw new Error(
                `Quiz batch ${batch + 1} of ${batchCount} returned no questions`,
              );
            }
            return result;
          },
        );
        generatedQuestions = generatedQuestions.concat(produced.questions);
        fromCache = fromCache && produced.fromCache;
      }

      console.log(
        `[Inngest] AI returned ${generatedQuestions.length} questions`,
      );

      if (generatedQuestions.length === 0) {
        console.error(
          `[Inngest] AI returned 0 questions - marking quiz as ERROR`,
        );
        await prisma.quiz.update({
          where: { id: quizId },
          data: { status: "ERROR" },
        });
        throw new Error("AI returned no questions");
      }

      console.log(
        `[Inngest] Sample question:`,
        JSON.stringify(generatedQuestions[0], null, 2),
      );

      // Hints ride in the quiz metadata map keyed by question order, so no
      // schema change is needed and old quizzes without hints read as empty.
      const hintMap: Record<string, string> = {};
      for (const [index, q] of generatedQuestions.entries()) {
        const hint =
          "hint" in q && typeof q.hint === "string" ? q.hint.trim() : "";
        if (hint) hintMap[String(index)] = hint;
      }

      await prisma.quiz.update({
        where: { id: quizId },
        data: {
          questionCount: generatedQuestions.length,
          status: "READY",
          metadata:
            Object.keys(hintMap).length > 0 ? { hints: hintMap } : undefined,
          questions: {
            create: generatedQuestions.map((q, index) => ({
              type: q.type,
              question: q.question,
              options: q.type === "MCQ" ? q.options : [],
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              sourcePages:
                "sourcePages" in q && Array.isArray(q.sourcePages)
                  ? q.sourcePages
                  : [],
              order: index,
              marks: "marks" in q && typeof q.marks === "number" ? q.marks : 1,
              markSchemeMd:
                "markSchemeMd" in q && typeof q.markSchemeMd === "string"
                  ? q.markSchemeMd
                  : null,
              examinerNote:
                "examinerNote" in q && typeof q.examinerNote === "string"
                  ? q.examinerNote
                  : null,
            })),
          },
        },
      });

      // A cache hit means no model ran, so there is nothing to charge for. The
      // quota was already counted when the student asked.
      if (fromCache) {
        console.log(
          `[Inngest] Quiz ${quizId} served from cache, skipping the credit debit`,
        );
      } else if (wantsDebit && userId) {
        try {
          const { spendCredits } = await import("@/lib/credits");
          await spendCredits({
            userId,
            amount: quizCost,
            type: "QUIZ_GENERATION",
            description: `Quiz from note: ${noteTitle || note.title}`,
            referenceId: quizId,
          });
        } catch (err) {
          console.error("[Inngest] Quiz credit debit failed:", err);
        }
      }

      console.log(`[Inngest] Quiz generated and saved successfully: ${quizId}`);
      return { success: true, quizId };
    } catch (error) {
      console.error(`[Inngest] Quiz generation failed:`, error);

      await prisma.quiz.update({
        where: { id: quizId },
        data: { status: "ERROR" },
      });

      throw error;
    }
  },
);

export const handleSubscriptionAction = inngest.createFunction(
  {
    name: "Handle Subscription Action",
    id: "handle-subscription-action",
    triggers: {
      event: "subscription/action",
    },
  },
  async ({ event }) => {
    const { subscriptionId, action, planLabel, amount, transactionId, reason } =
      event.data;

    console.log(
      `[Inngest] Processing subscription action: ${action} for ${subscriptionId}`,
    );

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      console.error(`[Inngest] Subscription not found: ${subscriptionId}`);
      return { success: false, error: "Subscription not found" };
    }

    const user = await prisma.user.findUnique({
      where: { id: subscription.userId },
    });

    if (!user) {
      console.error(`[Inngest] User not found: ${subscription.userId}`);
      return { success: false, error: "User not found" };
    }

    if (action === "ACTIVATE") {
      await inngest.send({
        name: "email.send.payment",
        data: {
          template: "payment-received",
          to: user.email,
          props: {
            firstName: user.name || "Student",
            planLabel: planLabel || subscription.plan,
            amountFcfa: amount || subscription.amount,
            reference: transactionId || subscription.fapshiTransId || "N/A",
            paidAt: new Date().toISOString(),
            practiceUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/quizzes`,
          },
        },
      });

      console.log(`[Inngest] Sent activation email to: ${user.email}`);
      return { success: true, action: "ACTIVATE" };
    }

    if (action === "REJECT") {
      await inngest.send({
        name: "email.send.payment",
        data: {
          template: "payment-failed",
          to: user.email,
          props: {
            firstName: user.name || "Student",
            planLabel: planLabel || subscription.plan,
            subscriptionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/subscription`,
          },
        },
      });

      console.log(`[Inngest] Sent rejection email to: ${user.email}`);
      return { success: true, action: "REJECT" };
    }

    return { success: false, error: "Unknown action" };
  },
);

export const monthlyCreditBonus = inngest.createFunction(
  {
    name: "Monthly Credit Bonus",
    id: "monthly-credit-bonus",
    triggers: {
      cron: "0 0 1 * *",
    },
  },
  async () => {
    console.log("[Inngest] Running monthly credit bonus job...");

    const BONUS_MAP: Record<string, number> = {
      STARTER: 400,
      STANDARD: 1_200,
      PREMIUM: 3_000,
      PRO: 3_000,
    };

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        plan: { in: ["STARTER", "STANDARD", "PREMIUM", "PRO"] },
      },
      select: {
        id: true,
        userId: true,
        plan: true,
      },
    });

    console.log(`[Inngest] Found ${subscriptions.length} active subscribers`);

    const { grantCredits } = await import("@/lib/credits");
    let grantedCount = 0;
    let errorCount = 0;

    for (const sub of subscriptions) {
      const bonus = BONUS_MAP[sub.plan];
      if (!bonus) continue;

      try {
        const result = await grantCredits({
          userId: sub.userId,
          amount: bonus,
          type: "BONUS",
          description: `Monthly credit bonus — ${sub.plan} plan (${bonus} credits)`,
          referenceId: `bonus-${sub.id}-${new Date().toISOString().slice(0, 7)}`,
        });

        if (!result.duplicate) {
          grantedCount++;
          console.log(
            `[Inngest] Granted ${bonus} credits to user ${sub.userId} (${sub.plan})`,
          );
        }
      } catch (error) {
        errorCount++;
        console.error(
          `[Inngest] Failed to grant bonus for user ${sub.userId}:`,
          error,
        );
      }
    }

    console.log(
      `[Inngest] Monthly credit bonus complete: ${grantedCount} granted, ${errorCount} errors`,
    );
    return { success: true, granted: grantedCount, errors: errorCount };
  },
);

export const generateChatTitle = inngest.createFunction(
  {
    name: "Generate Chat Title",
    id: "generate-chat-title",
    triggers: { event: "chat/generate-title" },
  },
  async ({ event }) => {
    const { conversationId, userContent, userId, provisionalTitle } =
      event.data;
    try {
      const { getPromptOrFallback } = await import("@/lib/prompts/loader");
      const { generateTextWithFallback } = await import(
        "@/lib/ai/orchestrator"
      );
      const { cleanGeneratedTitle, isReplaceableTitle } = await import(
        "@/lib/chat/title"
      );
      const prompt = await getPromptOrFallback("chat", "chat_title", {
        userMessage: userContent,
      });
      const result = await generateTextWithFallback({
        task: "fast_chat",
        prompt,
        userId: userId ?? null,
      });

      const newTitle = cleanGeneratedTitle(result.text);
      if (!newTitle) {
        return { success: true, title: provisionalTitle ?? null };
      }

      const { prisma } = await import("@/lib/prisma");
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        select: { title: true },
      });

      // A title the student renamed by hand wins over the model's suggestion.
      if (!isReplaceableTitle(conversation?.title, provisionalTitle)) {
        return { success: true, title: conversation?.title ?? null };
      }

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { title: newTitle },
      });
      return { success: true, title: newTitle };
    } catch (error) {
      console.error("Chat title generation error:", error);
      return { success: false, error: "Failed to generate chat title" };
    }
  },
);

/**
 * Render a PDF report to a buffer.
 *
 * `renderToBuffer` is typed to take a `ReactElement<DocumentProps>`, but React
 * 19 lets a component return `ReactNode | Promise<ReactNode>`. The mismatch is
 * real and harmless, so it is cast away once here rather than suppressed at each
 * call site with a comment that only covers the line it sits on.
 */
async function renderReportPdf(
  renderToBuffer: (document: never) => Promise<Buffer>,
  document: unknown,
): Promise<Buffer> {
  return renderToBuffer(document as never);
}

export const generateAdminReport = inngest.createFunction(
  {
    name: "Generate Admin Report",
    id: "generate-admin-report",
    triggers: { event: "admin/report.generate" },
  },
  async ({ event }) => {
    const { reportId, type } = event.data;
    const { setReport } = await import("@/lib/reports/store");
    setReport(reportId, { status: "PROCESSING" });
    try {
      const { renderToBuffer } = await import("@react-pdf/renderer");
      const { AffiliateReport, SubscriptionReport, UserReport } = await import(
        "@/components/pdf"
      );
      const { prisma } = await import("@/lib/prisma");
      const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return "-";
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };
      let pdfBuffer: Buffer;
      if (type === "users") {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
              select: { notes: true, quizzes: true, quizAttempts: true },
            },
          },
        });
        pdfBuffer = await renderReportPdf(
          renderToBuffer,
          UserReport({
            users: users.map((u) => ({
              id: u.id,
              name: u.name || "",
              email: u.email,
              role: u.role,
              createdAt: formatDate(u.createdAt),
              notesCount: u._count.notes,
              quizzesCount: u._count.quizzes,
              attemptsCount: u._count.quizAttempts,
            })),
            title: "User Report",
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
          }),
        );
      } else if (type === "subscriptions") {
        const subscriptions = await prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { name: true, email: true } } },
        });
        pdfBuffer = await renderReportPdf(
          renderToBuffer,
          SubscriptionReport({
            subscriptions: subscriptions.map((s) => ({
              id: s.id,
              plan: s.plan || "FREE",
              status: s.status || "PENDING",
              amount: s.amount || 0,
              startDate: formatDate(s.activatedAt),
              endDate: "N/A",
              user: { name: s.user?.name || "", email: s.user?.email || "" },
            })),
            title: "Subscription Report",
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
          }),
        );
      } else {
        const affiliates = await prisma.affiliate.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        pdfBuffer = await renderReportPdf(
          renderToBuffer,
          AffiliateReport({
            affiliates: affiliates.map((a) => ({
              id: a.id,
              code: a.code || "",
              status: a.status || "PENDING",
              commissionRate: 10,
              createdAt: formatDate(a.createdAt),
              user: { name: a.userName, email: a.userEmail },
              referralsCount: a.totalConversions,
            })),
            title: "Affiliate Report",
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
          }),
        );
      }
      setReport(reportId, {
        status: "COMPLETED",
        buffer: (pdfBuffer as Buffer).toString("base64"),
      });
      return { success: true, reportId };
    } catch (error) {
      console.error("Admin report generation error:", error);
      setReport(reportId, {
        status: "FAILED",
        error: "Failed to generate PDF",
      });
      return { success: false, error: "Failed to generate PDF" };
    }
  },
);

export const deleteUnverifiedAccounts = inngest.createFunction(
  {
    name: "Delete Unverified Accounts",
    id: "delete-unverified-accounts",
    triggers: {
      cron: "0 9 * * 0",
    },
  },
  async () => {
    console.log("[Inngest] Running weekly unverified account deletion job...");

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const usersToDelete = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lt: fourteenDaysAgo },
        warningSentAt: { not: null },
        accounts: {
          none: {},
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`[Inngest] Found ${usersToDelete.length} users to delete`);

    let deletedCount = 0;

    for (const user of usersToDelete) {
      try {
        await prisma.user.delete({
          where: { id: user.id },
        });

        deletedCount++;
        console.log(`[Inngest] Deleted unverified user: ${user.email}`);
      } catch (error) {
        console.error(`[Inngest] Failed to delete user ${user.email}:`, error);
      }
    }

    return {
      success: true,
      deleted: deletedCount,
      total: usersToDelete.length,
    };
  },
);

export { inngest };
