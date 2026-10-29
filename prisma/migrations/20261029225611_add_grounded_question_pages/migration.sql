-- AlterEnum
ALTER TYPE "CreditType" ADD VALUE 'PAGE_LOOKUP';

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "credit_cost_grounded_question" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "credit_cost_page_lookup" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "source_pages" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
