-- AlterTable
ALTER TABLE "paper3_questions" ADD COLUMN     "source_content_markdown" TEXT;

-- AlterTable
ALTER TABLE "paper3_sources" ADD COLUMN     "content_markdown" TEXT,
ADD COLUMN     "extracted_text" TEXT;

-- AddForeignKey
ALTER TABLE "paper3_mock_attempts" ADD CONSTRAINT "paper3_mock_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
