/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `payment_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payment_settings" ADD COLUMN     "key" TEXT NOT NULL DEFAULT 'global';

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_key_key" ON "payment_settings"("key");
