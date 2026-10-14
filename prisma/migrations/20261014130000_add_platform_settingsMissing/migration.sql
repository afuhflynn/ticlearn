-- Add the two platform_settings columns declared in schema.prisma but missing from migrations.
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "usd_to_xaf_rate" INTEGER NOT NULL DEFAULT 650,
  ADD COLUMN IF NOT EXISTS "ai_fusion_allow" BOOLEAN NOT NULL DEFAULT FALSE;
