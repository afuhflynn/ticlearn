-- Pivot to notes, quizzes and Tip.
--
-- This migration destroys all accounts, subscriptions, payments and content
-- rows on purpose. Cost history (ai_usage_events, daily_metrics), one-time
-- codes (verification) and the platform settings row survive. There is no
-- rollback: a Postgres point-in-time restore is the only way back.
--
-- Operator address supplied by the engineer at build time.

-- Two tables the old migration history never created (they arrived through
-- db:push, so a fresh clone would miss them). Created only if missing, so
-- this stays safe to run where they already exist.
CREATE TABLE IF NOT EXISTS "ai_model_health" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "tripped_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_health_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_model_health_model_id_key" ON "ai_model_health"("model_id");
CREATE TABLE IF NOT EXISTS "ai_usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "task" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost_xaf" INTEGER NOT NULL DEFAULT 0,
    "usd_to_xaf_rate" INTEGER NOT NULL DEFAULT 650,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_usage_events_user_id_created_at_idx" ON "ai_usage_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_model_id_created_at_idx" ON "ai_usage_events"("model_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_task_created_at_idx" ON "ai_usage_events"("task", "created_at");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_events_user_id_fkey') THEN
    ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Wipe every account and everything that hangs off one. The cost ledger
-- keeps its rows with the user set to null, which is what the AI budget is
-- measured against.
DELETE FROM "users";

-- Wipe the academic catalogue. Everything under it (programmes, components,
-- topics, questions, blueprints, mocks, sources, baselines) follows through
-- the cascade, because every one of those tables hangs off this root.
DELETE FROM "exam_levels";

-- Drop the columns the surviving tables no longer carry.
ALTER TABLE "users" DROP COLUMN "active_profile_id";
ALTER TABLE "topics" DROP COLUMN "component_id";
ALTER TABLE "topic_performances" DROP COLUMN "exam_profile_id";
ALTER TABLE "quiz_attempts" DROP COLUMN "exam_profile_id";
ALTER TABLE "user_stats" DROP COLUMN "exam_profile_id";
ALTER TABLE "notes" DROP COLUMN "subject";
ALTER TABLE "notes" DROP COLUMN "topics";
ALTER TABLE "revision_guides" DROP COLUMN "focus";

-- The new model requires these two columns, and every row above is gone.
ALTER TABLE "topics" ALTER COLUMN "name_slug" SET NOT NULL;
ALTER TABLE "topic_performances" ALTER COLUMN "note_id" SET NOT NULL;

-- Drop the dead tables, leaves first so no order can fail the run.
DROP TABLE
  "paper3_question_attempts",
  "paper3_detailed_results",
  "paper3_attempts",
  "paper3_mock_attempts",
  "paper3_user_stats",
  "user_topic_baselines",
  "exam_sessions",
  "mock_attempts",
  "paper3_mock_questions",
  "paper12_mock_module_items",
  "blueprint_sections",
  "exam_profile_programs",
  "paper3_mocks",
  "paper3_mock_modules",
  "paper3_questions",
  "paper3_sources",
  "paper12_mock_modules",
  "exam_blueprints",
  "questions",
  "exam_sources",
  "exam_profiles",
  "components",
  "programs",
  "exam_levels";

-- Drop the dead enums. None of them is referenced by any column anymore.
DROP TYPE "ComponentType";
DROP TYPE "ExamSubject";
DROP TYPE "ExamMode";
DROP TYPE "ExamStatus";
DROP TYPE "QuestionSource";
DROP TYPE "MockSourceMode";
DROP TYPE "MockCreationContext";
DROP TYPE "Paper3Subject";
DROP TYPE "Paper3Section";
DROP TYPE "Paper3Category";
DROP TYPE "Paper3PaperType";
DROP TYPE "Paper3SourceType";
DROP TYPE "Paper3Status";
DROP TYPE "Paper3SkillType";
DROP TYPE "Paper3TaskType";
DROP TYPE "Paper3FocusCategory";
DROP TYPE "Paper3Language";
DROP TYPE "QuestionStatus";
DROP TYPE "MockStatus";
DROP TYPE "MockAttemptStatus";
DROP TYPE "ProcessingStatus";
DROP TYPE "RevisionGuideFocus";

-- The single operator.
INSERT INTO "users" ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
VALUES (
  'admin-' || substr(md5(random()::text), 1, 12),
  'Administrator',
  'flyinnsafuh@gmail.com',
  true,
  'ADMIN',
  NOW(),
  NOW()
);
