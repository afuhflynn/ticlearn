/*
  Warnings:

  - You are about to drop the column `auto_value` on the `daily_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `manual_value` on the `daily_metrics` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'PRO';

-- AlterTable
ALTER TABLE "daily_metrics" DROP COLUMN "auto_value",
DROP COLUMN "manual_value",
ADD COLUMN     "autoValue" DOUBLE PRECISION,
ADD COLUMN     "manualValue" DOUBLE PRECISION;

-- RenameIndex
ALTER INDEX "kpi_events_created_at_idx" RENAME TO "kpi_events_createdAt_idx";
