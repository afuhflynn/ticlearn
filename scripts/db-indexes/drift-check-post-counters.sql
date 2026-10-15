-- Drift check for stored post totals. Expect zero rows. Run after the
-- backfill and any time counters look stale.
SELECT p."id"
FROM "posts" p
WHERE p."like_count" != (SELECT COUNT(*) FROM "post_likes" l WHERE l."post_id" = p."id")
   OR p."comment_count" != (SELECT COUNT(*) FROM "comments" c WHERE c."post_id" = p."id")
LIMIT 20;
