-- CreateEnum
CREATE TYPE "NoteProcessingStage" AS ENUM ('EXTRACTING', 'SUMMARIZING', 'INDEXING');

-- AlterTable
ALTER TABLE "notes" ADD COLUMN "processing_stage" "NoteProcessingStage";
