-- CreateEnum
CREATE TYPE "RevisionGuideFocus" AS ENUM ('DATABASE', 'C_PROGRAMMING', 'MIXED', 'SPREADSHEET', 'PROGRAMMING', 'WEB_PROGRAMMING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditType" ADD VALUE 'MOCK_EXAM';
ALTER TYPE "CreditType" ADD VALUE 'REVISION_GUIDE';
ALTER TYPE "CreditType" ADD VALUE 'AI_TUTOR_MESSAGE';

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global',
    "credit_cost_quiz_generation" INTEGER NOT NULL DEFAULT 50,
    "credit_cost_mock_question" INTEGER NOT NULL DEFAULT 10,
    "credit_cost_practice_question" INTEGER NOT NULL DEFAULT 5,
    "credit_cost_revision_guide_view" INTEGER NOT NULL DEFAULT 0,
    "credit_cost_revision_guide_gen" INTEGER NOT NULL DEFAULT 0,
    "credit_cost_ai_tutor_message" INTEGER NOT NULL DEFAULT 0,
    "mock_min_questions" INTEGER NOT NULL DEFAULT 5,
    "mock_max_questions" INTEGER NOT NULL DEFAULT 50,
    "enforce_credits_for_mocks" BOOLEAN NOT NULL DEFAULT false,
    "enforce_credits_for_practice" BOOLEAN NOT NULL DEFAULT false,
    "enforce_credits_for_revision_guides" BOOLEAN NOT NULL DEFAULT false,
    "enforce_credits_for_ai_tutor" BOOLEAN NOT NULL DEFAULT false,
    "use_ace_short_answer_grading" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision_guides" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "focus" "RevisionGuideFocus" NOT NULL DEFAULT 'MIXED',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "pdf_url" TEXT,
    "pdf_file_name" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE INDEX "revision_guides_published_idx" ON "revision_guides"("published");

-- CreateIndex
CREATE INDEX "revision_guides_created_by_id_idx" ON "revision_guides"("created_by_id");

-- AddForeignKey
ALTER TABLE "revision_guides" ADD CONSTRAINT "revision_guides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
