-- AlterTable
ALTER TABLE "paper3_questions" ADD COLUMN     "contentMd" TEXT,
ADD COLUMN     "sub_part" TEXT,
ADD COLUMN     "task_items" JSONB,
ADD COLUMN     "task_number" TEXT,
ADD COLUMN     "visual_elements" JSONB;
