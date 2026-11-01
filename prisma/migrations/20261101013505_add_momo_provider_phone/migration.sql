-- Add nullable provider plus phone columns beside live money rows (spec 0034).
-- Strangler step 1: columns stay nullable and inert until the routes cut over.
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "credit_purchase_orders" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "credit_purchase_orders" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE INDEX IF NOT EXISTS "credit_purchase_orders_status_idx" ON "credit_purchase_orders"("status");
