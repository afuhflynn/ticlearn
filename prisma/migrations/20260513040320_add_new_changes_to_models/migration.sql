/*
  Warnings:

  - The values [COURSE] on the enum `ComponentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `question_type` on the `blueprint_sections` table. All the data in the column will be lost.
  - You are about to drop the column `source_type` on the `questions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `paper3_user_stats` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `user_stats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `questionType` to the `blueprint_sections` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceType` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `questions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('UPLOADED', 'AI_GENERATED', 'RECONSTRUCTED', 'USER_UPLOADED');

-- AlterEnum
BEGIN;
CREATE TYPE "ComponentType_new" AS ENUM ('PAPER');
ALTER TABLE "components" ALTER COLUMN "type" TYPE "ComponentType_new" USING ("type"::text::"ComponentType_new");
ALTER TYPE "ComponentType" RENAME TO "ComponentType_old";
ALTER TYPE "ComponentType_new" RENAME TO "ComponentType";
DROP TYPE "public"."ComponentType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'PRO';

-- DropForeignKey
ALTER TABLE "topic_performances" DROP CONSTRAINT "topic_performances_topic_id_fkey";

-- DropIndex
DROP INDEX "paper3_user_stats_user_id_exam_profile_id_key";

-- DropIndex
DROP INDEX "user_stats_user_id_exam_profile_id_key";

-- AlterTable
ALTER TABLE "blueprint_sections" DROP COLUMN "question_type",
ADD COLUMN     "questionType" "QuestionType" NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "source_type",
ADD COLUMN     "sourceType" "QuestionSource" NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "QuestionType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "paper3_user_stats_user_id_key" ON "paper3_user_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- AddForeignKey
ALTER TABLE "topic_performances" ADD CONSTRAINT "topic_performances_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
