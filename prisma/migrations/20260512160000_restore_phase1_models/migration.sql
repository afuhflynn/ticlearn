-- Add unique constraint on users.active_profile_id
DROP INDEX IF EXISTS "users_active_profile_id_key";
CREATE UNIQUE INDEX "users_active_profile_id_key" ON "users"("active_profile_id");

-- Add index on exam_profiles.program_id
CREATE INDEX IF NOT EXISTS "exam_profiles_program_id_idx" ON "exam_profiles"("program_id");
