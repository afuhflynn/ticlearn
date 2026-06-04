-- AlterEnum
ALTER TYPE "FeedbackType" ADD VALUE 'CHAT';

-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "conversation_id" TEXT;

-- CreateIndex
CREATE INDEX "feedbacks_conversation_id_idx" ON "feedbacks"("conversation_id");
