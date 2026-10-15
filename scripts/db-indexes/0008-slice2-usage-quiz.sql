-- 0008 slice 2: usage plus quiz race per user indexes, outside any transaction.
-- Run with psql directly, never through prisma migrate, so CONCURRENTLY stays safe.
-- No paper or exam table appears here, per AC-11.

CREATE INDEX CONCURRENTLY IF NOT EXISTS quizzes_user_id_created_at_idx
  ON public.quizzes USING btree (user_id, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS quizzes_note_id_idx
  ON public.quizzes USING btree (note_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS quiz_attempts_user_id_completed_at_idx
  ON public.quiz_attempts USING btree (user_id, completed_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS chat_messages_conversation_id_created_at_idx
  ON public.chat_messages USING btree (conversation_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS chat_messages_user_id_role_created_at_idx
  ON public.chat_messages USING btree (user_id, role, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications USING btree (user_id, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS credit_transactions_user_id_created_at_idx
  ON public.credit_transactions USING btree (user_id, created_at);
