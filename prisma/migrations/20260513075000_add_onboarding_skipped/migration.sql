ALTER TABLE "exam_profiles" ADD COLUMN IF NOT EXISTS "onboarding_skipped" BOOLEAN NOT NULL DEFAULT false;
