-- CreateEnum
CREATE TYPE "CreditPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "CreditType" ADD VALUE 'CREDIT_PURCHASE';

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "enforce_credits_all" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "platform_settings" ADD COLUMN     "credits_per_1000_xaf" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "platform_settings" ADD COLUMN     "min_credit_purchase_xaf" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "platform_settings" ADD COLUMN     "max_credit_purchase_xaf" INTEGER NOT NULL DEFAULT 500000;

-- CreateTable
CREATE TABLE "credit_purchase_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_xaf" INTEGER NOT NULL,
    "credits_promised" INTEGER NOT NULL,
    "status" "CreditPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "fapshi_trans_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_purchase_orders_fapshi_trans_id_key" ON "credit_purchase_orders"("fapshi_trans_id");

-- CreateIndex
CREATE INDEX "credit_purchase_orders_user_id_idx" ON "credit_purchase_orders"("user_id");

-- AddForeignKey
ALTER TABLE "credit_purchase_orders" ADD CONSTRAINT "credit_purchase_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
