-- Create ExamProfileProgram join table
CREATE TABLE "exam_profile_programs" (
    "id" TEXT NOT NULL,
    "exam_profile_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "confidence" INTEGER DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_profile_programs_pkey" PRIMARY KEY ("id")
);

-- Migrate existing single programId to join table
INSERT INTO "exam_profile_programs" ("id", "exam_profile_id", "program_id", "confidence")
SELECT gen_random_uuid()::text, "id", "program_id", 3
FROM "exam_profiles"
WHERE "program_id" IS NOT NULL;

-- Create indexes
CREATE UNIQUE INDEX "exam_profile_programs_exam_profile_id_program_id_key"
  ON "exam_profile_programs"("exam_profile_id", "program_id");
CREATE INDEX "exam_profile_programs_exam_profile_id_idx"
  ON "exam_profile_programs"("exam_profile_id");

-- Drop old column and FK from exam_profiles
ALTER TABLE "exam_profiles" DROP CONSTRAINT IF EXISTS "exam_profiles_program_id_fkey";
DROP INDEX IF EXISTS "exam_profiles_program_id_idx";
ALTER TABLE "exam_profiles" DROP COLUMN "program_id";

-- AddForeignKey
ALTER TABLE "exam_profile_programs" ADD CONSTRAINT "exam_profile_programs_exam_profile_id_fkey"
  FOREIGN KEY ("exam_profile_id") REFERENCES "exam_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_profile_programs" ADD CONSTRAINT "exam_profile_programs_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
