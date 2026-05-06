-- CreateTable
CREATE TABLE "paper3_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "marks_earned" INTEGER NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "feedback" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper3_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper3_attempts_user_id_idx" ON "paper3_attempts"("user_id");

-- CreateIndex
CREATE INDEX "paper3_attempts_question_id_idx" ON "paper3_attempts"("question_id");

-- AddForeignKey
ALTER TABLE "paper3_attempts" ADD CONSTRAINT "paper3_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "paper3_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper3_attempts" ADD CONSTRAINT "paper3_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
