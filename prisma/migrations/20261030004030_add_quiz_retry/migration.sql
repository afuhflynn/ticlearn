-- CreateTable
CREATE TABLE "quiz_retries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "question_id" TEXT,
    "concept" VARCHAR(80) NOT NULL,
    "source_pages" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "source_excerpt" TEXT,
    "feedback_md" TEXT,
    "retry_question" TEXT NOT NULL,
    "retry_options" TEXT[],
    "retry_correct_answer" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "is_correct" BOOLEAN,
    "user_answer" TEXT,
    "model" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "quiz_retries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_retries_user_id_idx" ON "quiz_retries"("user_id");

-- CreateIndex
CREATE INDEX "quiz_retries_attempt_id_idx" ON "quiz_retries"("attempt_id");

-- CreateIndex
CREATE INDEX "quiz_retries_answer_id_created_at_idx" ON "quiz_retries"("answer_id", "created_at");

-- CreateIndex
CREATE INDEX "quiz_retries_quiz_id_idx" ON "quiz_retries"("quiz_id");

-- CreateIndex
CREATE INDEX "quiz_retries_status_idx" ON "quiz_retries"("status");

-- AddForeignKey
ALTER TABLE "quiz_retries" ADD CONSTRAINT "quiz_retries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_retries" ADD CONSTRAINT "quiz_retries_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_retries" ADD CONSTRAINT "quiz_retries_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "quiz_attempt_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_retries" ADD CONSTRAINT "quiz_retries_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
