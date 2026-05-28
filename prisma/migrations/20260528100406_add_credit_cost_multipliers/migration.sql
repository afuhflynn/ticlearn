-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "credit_cost_multiplier_premium" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
ADD COLUMN     "credit_cost_multiplier_pro" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
ADD COLUMN     "credit_cost_multiplier_standard" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
ADD COLUMN     "credit_cost_multiplier_starter" DOUBLE PRECISION NOT NULL DEFAULT 0.8;
