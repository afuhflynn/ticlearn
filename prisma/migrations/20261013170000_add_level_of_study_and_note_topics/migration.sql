-- DropForeignKey
ALTER TABLE "quiz_attempt_answers" DROP CONSTRAINT "quiz_attempt_answers_question_id_fkey";

-- DropForeignKey
ALTER TABLE "quiz_attempts" DROP CONSTRAINT "quiz_attempts_quiz_id_fkey";

-- DropForeignKey
ALTER TABLE "topic_performances" DROP CONSTRAINT "topic_performances_topic_id_fkey";

-- DropIndex
DROP INDEX "topic_performances_exam_profile_id_topic_id_key";

-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "note_id" TEXT;

-- AlterTable
ALTER TABLE "quiz_attempt_answers" ALTER COLUMN "question_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "quiz_attempts" ALTER COLUMN "quiz_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "topic_performances" ADD COLUMN     "note_id" TEXT,
ALTER COLUMN "exam_profile_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "name_slug" TEXT,
ALTER COLUMN "component_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "level_of_study" TEXT,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_skipped" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "topic_notes" (
    "id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_notes_note_id_idx" ON "topic_notes"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_notes_topic_id_note_id_key" ON "topic_notes"("topic_id", "note_id");

-- CreateIndex
CREATE INDEX "chat_conversations_note_id_idx" ON "chat_conversations"("note_id");

-- CreateIndex
CREATE INDEX "notes_user_id_createdAt_idx" ON "notes"("user_id", "createdAt");

-- CreateIndex
CREATE INDEX "topic_performances_note_id_idx" ON "topic_performances"("note_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_performances_note_id_topic_id_key" ON "topic_performances"("note_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_slug_key" ON "topics"("name_slug");

-- AddForeignKey
ALTER TABLE "topic_notes" ADD CONSTRAINT "topic_notes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_notes" ADD CONSTRAINT "topic_notes_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt_answers" ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

