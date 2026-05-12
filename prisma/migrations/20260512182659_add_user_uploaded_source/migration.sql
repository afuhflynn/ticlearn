ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "chk_question_source";
ALTER TABLE "questions" ADD CONSTRAINT "chk_question_source" CHECK ("source_type" IN ('UPLOADED', 'AI_GENERATED', 'RECONSTRUCTED', 'USER_UPLOADED'));
