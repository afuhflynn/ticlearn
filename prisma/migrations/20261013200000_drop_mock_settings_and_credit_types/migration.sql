-- AlterEnum
BEGIN;
CREATE TYPE "CreditType_new" AS ENUM ('REFERRAL_BONUS', 'QUIZ_GENERATION', 'REVISION_GUIDE', 'AI_TUTOR_MESSAGE', 'BONUS', 'CREDIT_PURCHASE');
ALTER TABLE "credit_transactions" ALTER COLUMN "type" TYPE "CreditType_new" USING ("type"::text::"CreditType_new");
ALTER TYPE "CreditType" RENAME TO "CreditType_old";
ALTER TYPE "CreditType_new" RENAME TO "CreditType";
DROP TYPE "public"."CreditType_old";
COMMIT;

-- AlterTable
ALTER TABLE "platform_settings" DROP COLUMN "credit_cost_mock_generation",
DROP COLUMN "credit_cost_mock_question",
DROP COLUMN "enforce_credits_for_mocks",
DROP COLUMN "mock_max_questions",
DROP COLUMN "mock_min_questions",
DROP COLUMN "use_ace_short_answer_grading";

