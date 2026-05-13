-- Create KpiEvent table
CREATE TABLE "kpi_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kpi_events_pkey" PRIMARY KEY ("id")
);

-- Create DailyMetric table
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "auto_value" DOUBLE PRECISION,
    "manual_value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "kpi_events_user_id_idx" ON "kpi_events"("user_id");
CREATE INDEX "kpi_events_event_idx" ON "kpi_events"("event");
CREATE INDEX "kpi_events_created_at_idx" ON "kpi_events"("createdAt");
CREATE UNIQUE INDEX "daily_metrics_date_metric_key" ON "daily_metrics"("date", "metric");
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics"("date");

-- Foreign keys
ALTER TABLE "kpi_events" ADD CONSTRAINT "kpi_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
