/*
  Warnings:

  - You are about to drop the `paper3_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "paper3_attempts" DROP CONSTRAINT "paper3_attempts_question_id_fkey";

-- DropForeignKey
ALTER TABLE "paper3_attempts" DROP CONSTRAINT "paper3_attempts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "paper3_mock_attempts" DROP CONSTRAINT "paper3_mock_attempts_user_id_fkey";

-- DropTable
DROP TABLE "paper3_attempts";
