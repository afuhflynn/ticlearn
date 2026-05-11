-- AlterEnum
ALTER TYPE "FeedbackType" ADD VALUE 'EXAM';

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "attempt_id" TEXT,
ADD COLUMN     "mock_id" TEXT,
ADD COLUMN     "rating" INTEGER DEFAULT 0;

-- CreateIndex
CREATE INDEX "feedbacks_attempt_id_idx" ON "feedbacks"("attempt_id");

-- AddForeignKey
ALTER TABLE "paper3_question_attempts" ADD CONSTRAINT "paper3_question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
