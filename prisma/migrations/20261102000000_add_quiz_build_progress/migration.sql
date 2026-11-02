ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "build_stage" TEXT;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "built_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "build_total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "build_error" TEXT;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "build_started_at" TIMESTAMPTZ(3);
CREATE INDEX IF NOT EXISTS "quizzes_status_build_started_at_idx" ON "quizzes"("status", "build_started_at");
