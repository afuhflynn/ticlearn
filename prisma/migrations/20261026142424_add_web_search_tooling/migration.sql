-- AlterEnum
ALTER TYPE "CreditType" ADD VALUE 'WEB_SEARCH';

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "credit_cost_web_search" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "web_search_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tool" TEXT NOT NULL,
    "query" TEXT,
    "url" TEXT,
    "query_hash" TEXT NOT NULL,
    "requested_depth" TEXT,
    "requested_recency" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CM',
    "served_by" TEXT,
    "fallback_used" BOOLEAN NOT NULL DEFAULT false,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "usable_count" INTEGER NOT NULL DEFAULT 0,
    "context_chars" INTEGER NOT NULL DEFAULT 0,
    "context_truncated" BOOLEAN NOT NULL DEFAULT false,
    "provider_credits" INTEGER NOT NULL DEFAULT 0,
    "credits_charged" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "attempts" JSONB NOT NULL,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_search_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "web_search_events_created_at_idx" ON "web_search_events"("created_at");

-- CreateIndex
CREATE INDEX "web_search_events_query_hash_created_at_idx" ON "web_search_events"("query_hash", "created_at");

-- CreateIndex
CREATE INDEX "web_search_events_user_id_created_at_idx" ON "web_search_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "web_search_events_served_by_created_at_idx" ON "web_search_events"("served_by", "created_at");

-- AddForeignKey
ALTER TABLE "web_search_events" ADD CONSTRAINT "web_search_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
