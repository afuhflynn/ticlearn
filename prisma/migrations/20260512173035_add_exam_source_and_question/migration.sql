-- Create ExamSource table
CREATE TABLE "exam_sources" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "session_name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_sources_pkey" PRIMARY KEY ("id")
);

-- Create Question table
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "exam_source_id" TEXT,
    "topic_id" TEXT,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER DEFAULT 3,
    "marks" INTEGER DEFAULT 1,
    "section" TEXT,
    "source_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- Add enums
ALTER TABLE "questions" ADD CONSTRAINT "chk_question_type" CHECK ("type" IN ('MCQ', 'STRUCTURED', 'PRACTICAL', 'ESSAY'));
ALTER TABLE "questions" ADD CONSTRAINT "chk_question_source" CHECK ("source_type" IN ('UPLOADED', 'AI_GENERATED', 'RECONSTRUCTED'));

-- Add enum values to existing QuestionType
ALTER TABLE "quiz_questions" DROP CONSTRAINT IF EXISTS "quiz_questions_type_check";
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_type_check" CHECK ("type" IN ('MCQ', 'OPEN', 'STRUCTURED', 'PRACTICAL', 'ESSAY'));

-- Indexes
CREATE UNIQUE INDEX "exam_sources_component_id_year_key" ON "exam_sources"("component_id", "year");
CREATE INDEX "exam_sources_component_id_idx" ON "exam_sources"("component_id");
CREATE INDEX "questions_component_id_idx" ON "questions"("component_id");
CREATE INDEX "questions_exam_source_id_idx" ON "questions"("exam_source_id");
CREATE INDEX "questions_topic_id_idx" ON "questions"("topic_id");

-- Foreign keys
ALTER TABLE "exam_sources" ADD CONSTRAINT "exam_sources_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_source_id_fkey"
  FOREIGN KEY ("exam_source_id") REFERENCES "exam_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_fkey"
  FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
