-- Campus ambassadors (spec 0036): stable referral code plus per invite audit rows.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ambassador_grant_blocked" BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  CREATE TYPE "AmbassadorReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'EXPIRED', 'FLAGGED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "ambassador_referrals" (
  "id" TEXT NOT NULL,
  "referrer_id" TEXT NOT NULL,
  "referred_user_id" TEXT,
  "invited_email" TEXT,
  "code_used" TEXT NOT NULL,
  "status" "AmbassadorReferralStatus" NOT NULL DEFAULT 'PENDING',
  "qualified_at" TIMESTAMPTZ(3),
  "rewarded_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ambassador_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_referral_code_key" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "ambassador_referrals_referrer_id_status_idx" ON "ambassador_referrals"("referrer_id", "status");
CREATE INDEX IF NOT EXISTS "ambassador_referrals_code_used_idx" ON "ambassador_referrals"("code_used");
CREATE INDEX IF NOT EXISTS "ambassador_referrals_invited_email_idx" ON "ambassador_referrals"("invited_email");
DO $$ BEGIN
  ALTER TABLE "ambassador_referrals" ADD CONSTRAINT "ambassador_referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
