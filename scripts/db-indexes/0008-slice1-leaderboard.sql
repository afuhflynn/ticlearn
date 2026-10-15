-- 0008 slice 1: leaderboard indexes, applied outside any transaction.
-- Run with psql directly, never through prisma migrate, so CONCURRENTLY stays safe.
-- No paper or exam table appears here, per AC-11.

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_role_created_at_idx
  ON public.users USING btree (role, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_referred_by_idx
  ON public.users USING btree (referred_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS user_stats_total_points_user_id_idx
  ON public.user_stats USING btree (total_points DESC, user_id ASC);
