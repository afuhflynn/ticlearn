-- Add enum values to QuestionType (if not already added)
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'STRUCTURED';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'PRACTICAL';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ESSAY';

-- CreateEnum
CREATE TYPE "MockSourceMode" AS ENUM ('DATABASE', 'HYBRID', 'RESEARCH');

-- CreateTable: exam_blueprints
CREATE TABLE "exam_blueprints" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_marks" INTEGER NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exam_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blueprint_sections
CREATE TABLE "blueprint_sections" (
    "id" TEXT NOT NULL,
    "blueprint_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question_count" INTEGER NOT NULL,
    "marks_per_question" INTEGER,
    "total_marks" INTEGER NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "answer_rule" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "blueprint_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: mock_attempts
CREATE TABLE "mock_attempts" (
    "id" TEXT NOT NULL,
    "exam_profile_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "blueprint_id" TEXT,
    "score" DOUBLE PRECISION,
    "total_marks" INTEGER NOT NULL,
    "source_mode" "MockSourceMode" NOT NULL,
    "time_taken" INTEGER,
    "answers" JSONB,
    "results" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mock_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "exam_blueprints_component_id_name_key" ON "exam_blueprints"("component_id", "name");
CREATE INDEX "exam_blueprints_component_id_idx" ON "exam_blueprints"("component_id");
CREATE INDEX "blueprint_sections_blueprint_id_idx" ON "blueprint_sections"("blueprint_id");
CREATE INDEX "mock_attempts_exam_profile_id_idx" ON "mock_attempts"("exam_profile_id");
CREATE INDEX "mock_attempts_component_id_idx" ON "mock_attempts"("component_id");
CREATE INDEX "mock_attempts_blueprint_id_idx" ON "mock_attempts"("blueprint_id");

-- AddForeignKeys
ALTER TABLE "exam_blueprints" ADD CONSTRAINT "exam_blueprints_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blueprint_sections" ADD CONSTRAINT "blueprint_sections_blueprint_id_fkey"
  FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_blueprint_id_fkey"
  FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
