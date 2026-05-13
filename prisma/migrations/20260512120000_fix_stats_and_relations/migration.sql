-- Drop old unique constraints
DROP INDEX IF EXISTS "user_stats_user_id_key";
DROP INDEX IF EXISTS "paper3_user_stats_user_id_key";

-- Add composite unique constraints
CREATE UNIQUE INDEX "user_stats_user_id_exam_profile_id_key" ON "user_stats"("user_id", "exam_profile_id");
CREATE UNIQUE INDEX "paper3_user_stats_user_id_exam_profile_id_key" ON "paper3_user_stats"("user_id", "exam_profile_id");
