/*
  Warnings:

  - The values [SPREADSHEET_FORMULA,CODE_EDITOR] on the enum `Paper3TaskType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Paper3Language" AS ENUM ('C', 'PASCAL');

-- AlterEnum
BEGIN;
CREATE TYPE "Paper3TaskType_new" AS ENUM ('EXCEL_FORMULA', 'EXCEL_GRID', 'ACCESS_TABLE', 'ACCESS_RELATIONSHIP', 'SQL_QUERY', 'C_PROGRAM', 'PASCAL_PROGRAM', 'ALGORITHM_PSEUDOCODE', 'INPUT_FIELD');
ALTER TABLE "paper3_questions" ALTER COLUMN "taskType" TYPE "Paper3TaskType_new" USING ("taskType"::text::"Paper3TaskType_new");
ALTER TYPE "Paper3TaskType" RENAME TO "Paper3TaskType_old";
ALTER TYPE "Paper3TaskType_new" RENAME TO "Paper3TaskType";
DROP TYPE "public"."Paper3TaskType_old";
COMMIT;

-- AlterTable
ALTER TABLE "paper3_questions" ADD COLUMN     "programming_language" "Paper3Language";
