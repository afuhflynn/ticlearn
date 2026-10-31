-- Add chat-sourced quiz attempt tracking columns to QuizAttempt
ALTER TABLE "quiz_attempts" ADD COLUMN "source" TEXT;

ALTER TABLE "quiz_attempts" ADD COLUMN "conversationId" TEXT;

ALTER TABLE "quiz_attempts" ADD COLUMN "clientRunId" TEXT UNIQUE;
