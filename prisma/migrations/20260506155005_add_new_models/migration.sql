-- CreateTable
CREATE TABLE "paper3_detailed_results" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "marks_earned" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "feedback" TEXT,
    "breakdown" JSONB,
    "partial_credit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper3_detailed_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper3_detailed_results_attempt_id_idx" ON "paper3_detailed_results"("attempt_id");

-- CreateIndex
CREATE INDEX "paper3_detailed_results_question_id_idx" ON "paper3_detailed_results"("question_id");

-- AddForeignKey
ALTER TABLE "paper3_detailed_results" ADD CONSTRAINT "paper3_detailed_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "paper3_mock_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_detailed_results" ADD CONSTRAINT "paper3_detailed_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "paper3_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
