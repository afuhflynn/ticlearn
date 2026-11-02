CREATE TABLE "onboarding_progress" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "current_step" INTEGER NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "onboarding_progress_user_id_key" ON "onboarding_progress"("user_id");
CREATE INDEX "onboarding_progress_user_id_idx" ON "onboarding_progress"("user_id");
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
