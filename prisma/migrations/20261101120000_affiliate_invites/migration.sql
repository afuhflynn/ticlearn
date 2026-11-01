-- Affiliate invites for partners (spec 0038)
ALTER TYPE "AffiliateStatus" ADD VALUE IF NOT EXISTS 'REVOKED';
ALTER TABLE "affiliate_earnings" ADD COLUMN IF NOT EXISTS "commission_rate" DOUBLE PRECISION;
ALTER TABLE "affiliate_earnings" ADD COLUMN IF NOT EXISTS "payout_reference" TEXT;
ALTER TABLE "affiliate_earnings" ADD COLUMN IF NOT EXISTS "order_reference" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'affiliate_earnings_order_reference_key') THEN
    CREATE UNIQUE INDEX "affiliate_earnings_order_reference_key" ON "affiliate_earnings"("order_reference");
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "partner_invites" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "invited_by" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_user_id" TEXT,
  "resend_count" INTEGER NOT NULL DEFAULT 0,
  "last_resent_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "partner_invites_email_idx" ON "partner_invites"("email");
CREATE INDEX IF NOT EXISTS "partner_invites_status_idx" ON "partner_invites"("status");
CREATE INDEX IF NOT EXISTS "partner_invites_token_idx" ON "partner_invites"("token");
ALTER TABLE "affiliate_earnings" ALTER COLUMN "plan" TYPE TEXT;
