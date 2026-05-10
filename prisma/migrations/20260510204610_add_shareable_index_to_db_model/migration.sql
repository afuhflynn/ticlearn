/*
  Warnings:

  - A unique constraint covering the columns `[share_id]` on the table `paper3_mock_attempts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "paper3_mock_attempts" ADD COLUMN     "share_id" TEXT,
ADD COLUMN     "shared_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "paper3_mock_attempts_share_id_key" ON "paper3_mock_attempts"("share_id");

-- CreateIndex
CREATE INDEX "paper3_mock_attempts_share_id_idx" ON "paper3_mock_attempts"("share_id");
