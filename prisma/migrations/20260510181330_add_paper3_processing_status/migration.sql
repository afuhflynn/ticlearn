-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "paper3_detailed_results" ADD COLUMN     "code_explanation" TEXT,
ADD COLUMN     "feedback_md" TEXT;

-- AlterTable
ALTER TABLE "paper3_mock_attempts" ADD COLUMN     "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'QUEUED';
