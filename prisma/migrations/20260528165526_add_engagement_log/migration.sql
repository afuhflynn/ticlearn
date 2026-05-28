-- CreateTable
CREATE TABLE "engagement_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagement_log_campaign_idx" ON "engagement_log"("campaign");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_log_user_id_campaign_key" ON "engagement_log"("user_id", "campaign");

-- AddForeignKey
ALTER TABLE "engagement_log" ADD CONSTRAINT "engagement_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
