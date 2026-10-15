-- 0008 slice 4: community plus search indexes, stored search column, drops.
-- Run with psql directly, never through prisma migrate, so CONCURRENTLY stays safe.
-- No paper or exam table appears here, per AC-11.

-- Stored counter columns, default zero so old reads stay live until cutover.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- Search: trigram support plus stored notes search vector.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION public.notes_search_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector(
    'simple',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.summary, '') || ' ' || coalesce(NEW.extracted_text, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_search_tsv_update ON public.notes;

CREATE TRIGGER notes_search_tsv_update
  BEFORE INSERT OR UPDATE OF title, summary, extracted_text ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_search_tsv_trigger();

CREATE INDEX CONCURRENTLY IF NOT EXISTS notes_search_tsv_gin_idx
  ON public.notes USING gin (search_tsv);

CREATE INDEX CONCURRENTLY IF NOT EXISTS notes_title_trgm_idx
  ON public.notes USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS quizzes_title_trgm_idx
  ON public.quizzes USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_content_trgm_idx
  ON public.posts USING gin (content gin_trgm_ops);

-- Community list composites.

CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_is_pinned_created_at_idx
  ON public.posts USING btree (is_pinned, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS posts_subject_created_at_idx
  ON public.posts USING btree (subject, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS comments_post_id_created_at_idx
  ON public.comments USING btree (post_id, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS comments_parent_id_created_at_idx
  ON public.comments USING btree (parent_id, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS affiliate_clicks_code_converted_idx
  ON public.affiliate_clicks USING btree (affiliate_code, converted);

-- Final proof drops: uniques already cover these, verified 2026-10-15.

DROP INDEX CONCURRENTLY IF EXISTS affiliates_code_idx;

DROP INDEX CONCURRENTLY IF EXISTS admin_invites_email_idx;

DROP INDEX CONCURRENTLY IF EXISTS admin_invites_token_idx;
