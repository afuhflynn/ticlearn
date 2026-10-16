-- Add period column to engagement_log (nullable first for safe migration)
ALTER TABLE "engagement_log" ADD COLUMN "period" VARCHAR;

-- Backfill existing rows with a period derived from the sent_at week
UPDATE "engagement_log"
SET "period" = to_char("sent_at", 'IYYY-"W"IW')
WHERE "period" IS NULL;

-- Make period non-null
ALTER TABLE "engagement_log" ALTER COLUMN "period" SET NOT NULL;

-- Drop the old unique constraint on (user_id, campaign)
DO $$
DECLARE constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = '"engagement_log"'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%user_id%campaign%'
    AND pg_get_constraintdef(oid) NOT LIKE '%period%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "engagement_log" DROP CONSTRAINT "' || constraint_name || '"';
  END IF;
END $$;

-- Add the period-scoped unique constraint
ALTER TABLE "engagement_log" ADD CONSTRAINT "engagement_log_user_id_campaign_period_key" UNIQUE ("user_id", "campaign", "period");

-- Create email_suppression table
CREATE TABLE "email_suppression" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "reason" TEXT NOT NULL,
  "user_id" TEXT,
  "provider_message_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "email_suppression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "email_suppression_email_idx" ON "email_suppression"("email");
