-- Add marks plus scheme columns for spec 0035
ALTER TABLE "quiz_questions" ADD COLUMN "marks" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "quiz_questions" ADD COLUMN "mark_scheme_md" TEXT;
ALTER TABLE "quiz_questions" ADD COLUMN "examiner_note" TEXT;

ALTER TABLE "quiz_attempts" ADD COLUMN "total_marks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quiz_attempts" ADD COLUMN "marks_earned" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "quiz_attempt_answers" ADD COLUMN "marks_earned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quiz_attempt_answers" ADD COLUMN "marks_total" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "quiz_attempt_answers" ADD COLUMN "mark_scheme_md" TEXT;
