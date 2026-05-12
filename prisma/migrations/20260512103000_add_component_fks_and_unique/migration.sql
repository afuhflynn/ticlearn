-- Add unique constraint on Component (programId, code)
CREATE UNIQUE INDEX "components_program_id_code_key" ON "components"("program_id", "code");

-- Add foreign keys for componentId columns
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "paper3_sources" ADD CONSTRAINT "paper3_sources_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "paper3_questions" ADD CONSTRAINT "paper3_questions_component_id_fkey"
  FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on paper3_questions.component_id
CREATE INDEX "paper3_questions_component_id_idx" ON "paper3_questions"("component_id");
