-- AlterTable
ALTER TABLE "paper3_user_stats" ADD COLUMN     "total_points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "paper3_question_attempts" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "mock_id" TEXT,
    "attempt_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "marks_earned" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "time_answered" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper3_question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper3_question_attempts_question_id_score_idx" ON "paper3_question_attempts"("question_id", "score");

-- CreateIndex
CREATE INDEX "paper3_question_attempts_question_id_user_id_idx" ON "paper3_question_attempts"("question_id", "user_id");
