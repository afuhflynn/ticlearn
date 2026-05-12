/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `paper3_user_stats` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `user_stats` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "paper3_user_stats_user_id_exam_profile_id_key";

-- DropIndex
DROP INDEX "user_stats_user_id_exam_profile_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "paper3_user_stats_user_id_key" ON "paper3_user_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");
