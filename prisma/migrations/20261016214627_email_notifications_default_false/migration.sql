-- DropForeignKey
ALTER TABLE "email_suppression" DROP CONSTRAINT "email_suppression_user_id_fkey";

-- DropIndex
DROP INDEX "engagement_log_user_id_campaign_key";

-- AlterTable
ALTER TABLE "email_suppression" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "engagement_log" ALTER COLUMN "period" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_settings" ALTER COLUMN "email_notifications" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "email_suppression" ADD CONSTRAINT "email_suppression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
