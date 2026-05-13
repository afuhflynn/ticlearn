-- Make active_profile_id unique on users
CREATE UNIQUE INDEX "users_active_profile_id_key" ON "users"("active_profile_id");

-- Make Paper3Attempt.question required (was optional)
-- No SQL change needed since questionId was already NOT NULL
