import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { evaluateAnswer } from "@/lib/paper3/evaluate";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma/client";

const aiModel = openai("gpt-5.5");

type EvaluateExamEvent = {
  attemptId: string;
  mockId: string;
  userId: string;
  examProfileId?: string | null;
  answers: Record<string, string>;
  timeTaken: number;
};

const codeExplanationSchema = z.object({
  explanations: z.array(
    z.object({
      lineNumber: z.string(),
      explanation: z.string(),
      hasIssue: z.boolean(),
      issueDescription: z.string().optional(),
    }),
  ),
  summary: z.string(),
});

const aiFeedbackSchema = z.object({
  feedbackMd: z.string(),
  codeExplanation: z.string().nullable().optional(),
});

export const evaluatePaper3Exam = inngest.createFunction(
  {
    name: "Evaluate Paper 3 Exam",
    id: "evaluate-paper3-exam",
    triggers: {
      event: "paper3/evaluate-exam",
    },
  },
  async ({ event, step }) => {
    const { attemptId, mockId, userId, examProfileId, answers, timeTaken } =
      event.data as EvaluateExamEvent;

    await step.run("update-status-to-processing", async () => {
      await prisma.paper3MockAttempt.update({
        where: { id: attemptId },
        data: { processingStatus: "PROCESSING" },
      });
    });

    const mock = await step.run("fetch-mock-with-questions", async () => {
      return prisma.paper3Mock.findUnique({
        where: { id: mockId },
        include: {
          questions: {
            include: { question: true },
          },
        },
      });
    });

    if (!mock) {
      throw new Error(`Mock exam not found: ${mockId}`);
    }

    const attempt = await step.run("fetch-attempt", async () => {
      return prisma.paper3MockAttempt.findUnique({
        where: { id: attemptId },
      });
    });

    const correctAnswerViewed = attempt?.correctAnswerViewed ?? false;

    const evaluationResults = await step.run("evaluate-answers", async () => {
      const results: Array<{
        questionId: string;
        userAnswer: string;
        isCorrect: boolean;
        marksEarned: number;
        totalMarks: number;
        feedback: string;
        feedbackMd: string | null;
        codeExplanation: string | null;
        breakdown: Array<{
          criteria: string;
          marks: number;
          description: string;
        }>;
        partialCredit: boolean;
        taskType: string;
        questionTitle: string;
        userAnswerForAi: string;
        expectedAnswer: string;
        questionContentMd: string | null;
      }> = [];

      for (const mq of mock.questions) {
        const userAnswer = answers[mq.question.id] || "";

        const result = await evaluateAnswer(
          {
            taskType: mq.question.taskType,
            expectedAnswer: mq.question.expectedAnswer,
            totalMarks: mq.marks,
            partialCredit: mq.question.partialCredit,
            markingBreakdown: mq.question.markingBreakdown as
              | Array<{
                  criteria: string;
                  marks: number;
                  description: string;
                }>
              | undefined,
            language: mq.question.programmingLanguage ?? undefined,
          },
          userAnswer,
        );

        const finalMarksEarned = correctAnswerViewed ? 0 : result.marksEarned;

        results.push({
          questionId: mq.question.id,
          userAnswer,
          isCorrect: result.isCorrect,
          marksEarned: finalMarksEarned,
          totalMarks: result.totalMarks,
          feedback: result.feedback,
          feedbackMd: null,
          codeExplanation: null,
          breakdown: result.breakdown,
          partialCredit: result.partialCredit,
          taskType: mq.question.taskType,
          questionTitle: mq.question.title,
          userAnswerForAi: userAnswer,
          expectedAnswer: mq.question.expectedAnswer,
          questionContentMd: mq.question.contentMd,
        });
      }

      return results;
    });

    const enrichedResults = await step.run("generate-ai-feedback", async () => {
      const enriched: typeof evaluationResults = [];

      for (const result of evaluationResults) {
        let feedbackMd = "";
        let codeExplanation = null;

        if (result.isCorrect) {
          feedbackMd = `## Feedback\n\n${result.feedback}`;
        } else {
          const needsCodeExplanation = [
            "C_PROGRAM",
            "PASCAL_PROGRAM",
            "WEB_PROGRAMMING",
            "ALGORITHM_PSEUDOCODE",
          ].includes(result.taskType);

          feedbackMd = `## Feedback\n\n${result.feedback}\n\n### Expected Answer\n\n${result.taskType === "WEB_PROGRAMMING" ? "<!-- HTML Preview Below -->" : `\`\`\`\n${result.expectedAnswer}\n\`\`\``}`;

          if (needsCodeExplanation && result.userAnswerForAi.trim()) {
            try {
              const { object } = await generateObject({
                model: aiModel,
                schema: codeExplanationSchema,
                prompt: `You are a GCE A-Level Computer Science examiner. Analyze this student's code answer and explain what went wrong.

Question: ${result.questionTitle}
Expected Answer:
${result.expectedAnswer}

Student's Answer:
${result.userAnswerForAi}

For each line or logical section in the student's code:
1. Explain what the code does
2. Identify if there's an issue and what it is
3. Suggest the correction

Provide line-by-line explanations in a code comment style.`,
              });

              const explanationLines = object.explanations.map(
                (exp) =>
                  `// Line ${exp.lineNumber}: ${exp.explanation}${exp.hasIssue ? `\n// ⚠️ ${exp.issueDescription}` : ""}`,
              );

              codeExplanation = `// Code Analysis for: ${result.questionTitle}\n${explanationLines.join("\n")}\n\n// Summary:\n${object.summary}`;

              feedbackMd += `\n\n### Code Explanation\n\n\`\`\`\n${codeExplanation}\n\`\`\``;
            } catch {
              // Keep feedbackMd as is if AI explanation fails
            }
          }

          if (result.partialCredit) {
            feedbackMd += `\n\n### Partial Credit Explanation\n\nYou earned ${result.marksEarned} out of ${result.totalMarks} marks. Review the marking breakdown below for details on what was correct and what needs improvement.`;
          }
        }

        enriched.push({
          ...result,
          feedbackMd,
          codeExplanation,
        });
      }

      return enriched;
    });

    await step.run("save-detailed-results", async () => {
      for (const result of enrichedResults) {
        await prisma.paper3DetailedResult.create({
          data: {
            attemptId,
            questionId: result.questionId,
            userAnswer: result.userAnswer,
            isCorrect: result.isCorrect,
            marksEarned: result.marksEarned,
            totalMarks: result.totalMarks,
            feedback: result.feedback,
            feedbackMd: result.feedbackMd,
            codeExplanation: result.codeExplanation,
            breakdown: result.breakdown as unknown as Prisma.JsonObject,
            partialCredit:
              result.marksEarned > 0 && result.marksEarned < result.totalMarks,
          },
        });
      }
    });

    const totalEarned = enrichedResults.reduce(
      (sum, r) => sum + r.marksEarned,
      0,
    );
    const score = (totalEarned / mock.totalMarks) * 100;
    const correctCount = enrichedResults.filter((r) => r.isCorrect).length;
    const wrongCount = enrichedResults.length - correctCount;

    const basePoints =
      score >= 80 ? 20 : score >= 60 ? 15 : score >= 40 ? 10 : 5;
    const aiBonus = correctCount * 2;
    const pointsEarned = basePoints + aiBonus;

    const resultsForUpdate = enrichedResults.map((r) => ({
      questionId: r.questionId,
      userAnswer: r.userAnswer,
      isCorrect: r.isCorrect,
      marksEarned: r.marksEarned,
      totalMarks: r.totalMarks,
      feedback: r.feedback,
      feedbackMd: r.feedbackMd,
      breakdown: r.breakdown,
      partialCredit: r.partialCredit,
    }));

    await step.run("update-attempt-and-stats", async () => {
      await prisma.$transaction(async (tx) => {
        await tx.paper3MockAttempt.update({
          where: { id: attemptId },
          data: {
            score,
            timeTaken,
            answers,
            results: resultsForUpdate,
            status: "COMPLETED",
            processingStatus: "COMPLETED",
            completedAt: new Date(),
          },
        });

        for (const result of enrichedResults) {
          await tx.paper3QuestionAttempt.create({
            data: {
              questionId: result.questionId,
              mockId: mock.id,
              attemptId: attemptId,
              userId,
              ...(examProfileId ? { examProfileId } : {}),
              userAnswer: result.userAnswer,
              isCorrect: result.isCorrect,
              marksEarned: result.marksEarned,
              score: (result.marksEarned / result.totalMarks) * 100,
            },
          });
        }

        const existingStats = await tx.paper3UserStats.findFirst({
          where: { userId },
        });

        if (existingStats) {
          const newExamsTaken = existingStats.mockExamsTaken + 1;
          const newAvg =
            (existingStats.avgScore * existingStats.mockExamsTaken + score) /
            newExamsTaken;

          await tx.paper3UserStats.update({
            where: { id: existingStats.id },
            data: {
              mockExamsTaken: newExamsTaken,
              avgScore: Math.round(newAvg),
              questionsCorrect: existingStats.questionsCorrect + correctCount,
              totalPoints: existingStats.totalPoints + pointsEarned,
            },
          });
        } else {
          await tx.paper3UserStats.create({
            data: {
              userId,
              ...(examProfileId ? { examProfileId } : {}),
              mockExamsTaken: 1,
              avgScore: score,
              questionsCorrect: correctCount,
              totalPoints: pointsEarned,
            },
          });
        }

        const existingUserStats = await tx.userStats.findFirst({
          where: { userId },
        });

        if (existingUserStats) {
          await tx.userStats.update({
            where: { id: existingUserStats.id },
            data: {
              totalPoints: existingUserStats.totalPoints + pointsEarned,
              quizzesTaken: existingUserStats.quizzesTaken + 1,
              lastActivityDate: new Date(),
            },
          });
        } else {
          await tx.userStats.create({
            data: {
              userId,
              ...(examProfileId ? { examProfileId } : {}),
              totalPoints: pointsEarned,
              quizzesTaken: 1,
              lastActivityDate: new Date(),
            },
          });
        }
      });
    });

    return {
      success: true,
      attemptId,
      score,
      totalEarned,
      correctCount,
      wrongCount,
      pointsEarned,
      processingStatus: "COMPLETED",
    };
  },
);

export const dispatchPaper3ExamEvaluation = inngest.createFunction(
  {
    name: "Dispatch Paper 3 Exam Evaluation",
    id: "dispatch-paper3-exam-evaluation",
  },
  async ({ event, step }) => {
    const data = event.data as EvaluateExamEvent;

    await step.run("create-initial-attempt", async () => {
      return prisma.paper3MockAttempt.create({
        data: {
          userId: data.userId,
          mockId: data.mockId,
          score: 0,
          totalMarks: 0,
          answers: data.answers,
          results: [],
          status: "IN_PROGRESS",
          processingStatus: "QUEUED",
          timeTaken: data.timeTaken,
        },
      });
    });

    await step.run("send-evaluation-event", async () => {
      return inngest.send({
        name: "paper3/evaluate-exam",
        data,
      });
    });

    return { success: true };
  },
);
