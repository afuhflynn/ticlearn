-- 0008 slice 3: admin metrics plus users plus analytics indexes.
-- Run with psql directly, never through prisma migrate, so CONCURRENTLY stays safe.
-- No paper or exam table appears here, per AC-11.

CREATE INDEX CONCURRENTLY IF NOT EXISTS kpi_events_user_id_created_at_idx
  ON public.kpi_events USING btree (user_id, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS kpi_events_event_created_at_idx
  ON public.kpi_events USING btree (event, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS daily_metrics_metric_date_idx
  ON public.daily_metrics USING btree (metric, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_status_created_at_idx
  ON public.subscriptions USING btree (status, "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS engagement_log_campaign_sent_at_idx
  ON public.engagement_log USING btree (campaign, sent_at);
