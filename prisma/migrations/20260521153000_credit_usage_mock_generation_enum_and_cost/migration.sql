-- AlterEnum
ALTER TYPE "CreditType" ADD VALUE 'MOCK_GENERATION';

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN "credit_cost_mock_generation" INTEGER NOT NULL DEFAULT 40;

-- Enable consumption defaults on existing global settings row (admins can switch back off).
UPDATE "platform_settings"
SET
  "enforce_credits_for_mocks" = true,
  "enforce_credits_for_practice" = true,
  "enforce_credits_for_ai_tutor" = true,
  "credit_cost_ai_tutor_message" = GREATEST("credit_cost_ai_tutor_message", 5),
  "credit_cost_mock_generation" = GREATEST("credit_cost_mock_generation", 40)
WHERE "key" = 'global';

ALTER TABLE "platform_settings" ALTER COLUMN "enforce_credits_for_mocks" SET DEFAULT true;
ALTER TABLE "platform_settings" ALTER COLUMN "enforce_credits_for_practice" SET DEFAULT true;
ALTER TABLE "platform_settings" ALTER COLUMN "enforce_credits_for_ai_tutor" SET DEFAULT true;
ALTER TABLE "platform_settings" ALTER COLUMN "credit_cost_ai_tutor_message" SET DEFAULT 5;
