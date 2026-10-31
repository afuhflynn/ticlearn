-- Rename chat quiz columns to snake case to match the Prisma naming convention.
-- Renames keep existing data instead of dropping and re-adding the columns.
ALTER TABLE "quiz_attempts" RENAME COLUMN "conversationId" TO "conversation_id";

ALTER TABLE "quiz_attempts" RENAME COLUMN "clientRunId" TO "client_run_id";
